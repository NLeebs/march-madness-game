import requests
import re
import json
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
from bs4 import BeautifulSoup

###### Set up Flask App ######
app = Flask(__name__)
cors = CORS(app)
IS_STDIN_JSON_MODE = False

def _require_tag(tag, team_name, stat_name, source_name):
    if tag is None:
        raise ValueError(
            f"[{team_name}] Missing element for '{stat_name}' in {source_name}"
        )
    return tag

def _extract_prev_by_data_sort(soup, list_name, team_name, stat_name, source_name):
    stat_td = _require_tag(
        soup.find("td", attrs={"data-sort": list_name}),
        team_name,
        f"{stat_name} (data-sort={list_name})",
        source_name,
    )
    value_td = _require_tag(
        stat_td.find_previous("td"),
        team_name,
        stat_name,
        source_name,
    )
    return value_td.contents[0]

def _extract_next_by_data_sort(soup, list_name, team_name, stat_name, source_name):
    stat_td = _require_tag(
        soup.find("td", attrs={"data-sort": list_name}),
        team_name,
        f"{stat_name} (data-sort={list_name})",
        source_name,
    )
    value_td = _require_tag(
        stat_td.find_next("td"),
        team_name,
        stat_name,
        source_name,
    )
    return value_td.contents[0]

def _extract_next_by_label(soup, label, team_name, stat_name, source_name):
    label_td = _require_tag(
        soup.find("td", string=label),
        team_name,
        f"{stat_name} (label={label})",
        source_name,
    )
    value_td = _require_tag(
        label_td.find_next("td"),
        team_name,
        stat_name,
        source_name,
    )
    return value_td.contents[0]

###### Create the reciever API POST endpoint ######
@app.route("/ncaa-stats", methods=["POST"])
def ncaa_stats():
    # Convert JSON to Python
    JS_URL_data = request.get_json()

    # Set headers for Soup calls
    headers = requests.utils.default_headers()
    headers.update({
        'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:52.0) Gecko/20100101 Firefox/52.0',
    })

    # Define general soups from URLs
    strenght_of_schedule_URL = "https://www.teamrankings.com/ncaa-basketball/ranking/schedule-strength-by-other"
    strenght_of_schedule_page = requests.get(strenght_of_schedule_URL, headers=headers)
    strenght_of_schedule_soup = BeautifulSoup(strenght_of_schedule_page.content,"html.parser")

    team_possessions_URL ="https://www.teamrankings.com/ncaa-basketball/stat/possessions-per-game"
    team_possessions_page = requests.get(team_possessions_URL, headers=headers)
    team_possessions_soup = BeautifulSoup(team_possessions_page.content,"html.parser")

    team_RPI_URL = "https://www.teamrankings.com/ncb/rpi/"
    team_RPI_page = requests.get(team_RPI_URL, headers=headers)
    team_RPI_soup = BeautifulSoup(team_RPI_page.content, "html.parser")

    # Use Team Stats URL to construct dictionary
    conference_team_stats = []
    for count, i in enumerate(JS_URL_data.keys()):
        list_name = JS_URL_data.get(i, {}).get("list-name") or i
        try:
            # get team strenght of schedule
            strenght_of_schedule = _extract_prev_by_data_sort(
                strenght_of_schedule_soup,
                list_name,
                i,
                "schedule-strength",
                "teamrankings schedule strength page",
            )
        
            # get team possessions
            team_possessions = _extract_next_by_data_sort(
                team_possessions_soup,
                list_name,
                i,
                "possessions",
                "teamrankings possessions page",
            )

            # get team RPI Ranking
            team_RPI = _extract_prev_by_data_sort(
                team_RPI_soup,
                list_name,
                i,
                "rpi",
                "teamrankings rpi page",
            )

            # get team colors
            if JS_URL_data.get(i, {}).get("primary-color"):
                team_primary_color = JS_URL_data.get(i, {}).get("primary-color")
                team_secondary_color = JS_URL_data.get(i, {}).get("secondary-color")
            else:
                team_colors_URL = JS_URL_data.get(i, {}).get("team-colors-URL")
                team_colors_page = requests.get(team_colors_URL, headers=headers)
                team_colors_soup = BeautifulSoup(team_colors_page.content,"html.parser")
                color_block_el = team_colors_soup.find_all("div", attrs={"class": "colorblock"})
                primary_attr_content= color_block_el[0]['style']
                team_primary_color = re.search(r'#[0-9a-fA-F]{6}', primary_attr_content).group(0)

                if len(color_block_el[1]['class']) > 1:
                    if color_block_el[1]['class'][1] == 'white':
                        team_secondary_color = "#FFFFFF"
                    elif color_block_el[1]['class'][1] == 'black':
                        team_secondary_color = "#000000"
                else:
                    secondary_attr_content = color_block_el[1]['style']
                    team_secondary_color = re.search(r'#[0-9a-fA-F]{3,6}', secondary_attr_content).group(0)
            
        ###### Archive team colors ######
        # hexcode_el_list = team_colors_soup.find_all("td", string="Hex color:")
        # team_primary_color = hexcode_el_list[0].find_next("td").contents[0]
        # if len(hexcode_el_list) > 1:
        #     team_secondary_color = hexcode_el_list[1].find_next("td").contents[0]
        # else: 
        #     team_secondary_color = "#FFFFFF"


            # get team stats
            team_stats_URL = JS_URL_data.get(i, {}).get("team-stats-URL")
            team_stats_page = requests.get(team_stats_URL, headers=headers)
            team_stats_soup = BeautifulSoup(team_stats_page.content,"html.parser")
            field_goal_attempts = float(_extract_next_by_label(
                team_stats_soup, "FGA/Game", i, "field-goal-attempts", team_stats_URL
            ).strip(' '))
            three_point_attempts = float(_extract_next_by_label(
                team_stats_soup, "3PA/Game", i, "three-point-attempts", team_stats_URL
            ).strip(' '))

            # get mascot
            team_mascot_content = team_stats_soup.find("h1").contents[0]
            if JS_URL_data.get(i, {}).get("mascot-name"):
                team_mascot = JS_URL_data.get(i, {}).get("mascot-name")
            else:
                team_mascot = team_mascot_content.lstrip(i + " ").rstrip("Stats").rstrip()

            #Create return object
            team_stats_dic = {
               i: { 
                   "name": i,
                   "mascot": team_mascot,
                   "logo": JS_URL_data.get(i, {}).get("team-logo-URL"),
                   "schedule-strength": strenght_of_schedule,
                   "possessions": team_possessions,
                   "rpi": team_RPI,
                   "primary-color": team_primary_color,
                   "secondary-color": team_secondary_color,
                   "stats-defense": {
                        "cause-turnover-percentage": round(float(_extract_next_by_label(team_stats_soup, "Opp Turnovers/Play", i, "cause-turnover-percentage", team_stats_URL).strip('% '))/100, 3),
                        "commit-foul-percentage": round(float(_extract_next_by_label(team_stats_soup, "Personal Fouls/Play", i, "commit-foul-percentage", team_stats_URL).strip('% '))/100, 3),
                        "defensive-rebound-percentage": round(float(_extract_next_by_label(team_stats_soup, "Def Rebound %", i, "defensive-rebound-percentage", team_stats_URL).strip('% '))/100, 3),
                        "opp-three-point-percentage": round(float(_extract_next_by_label(team_stats_soup, "Opp Three Point %", i, "opp-three-point-percentage", team_stats_URL).strip('% '))/100, 3),
                        "opp-two-point-percentage": round(float(_extract_next_by_label(team_stats_soup, "Opp Two Point %", i, "opp-two-point-percentage", team_stats_URL).strip('% '))/100, 3),
                    },
                    "stats-offensive": {
                        "draw-foul-percentage": round(float(_extract_next_by_label(team_stats_soup, "Opp Personal Fouls/Play", i, "draw-foul-percentage", team_stats_URL).strip('% '))/100, 3),
                        "free-throw-percentage": round(float(_extract_next_by_label(team_stats_soup, "Free Throw %", i, "free-throw-percentage", team_stats_URL).strip('% '))/100, 3),
                        "offensive-rebound-percentage": round(float(_extract_next_by_label(team_stats_soup, "Off Rebound %", i, "offensive-rebound-percentage", team_stats_URL).strip('% '))/100, 3),
                        "three-point-percentage": round(float(_extract_next_by_label(team_stats_soup, "Three Point %", i, "three-point-percentage", team_stats_URL).strip('% '))/100, 3),
                        "two-point-percentage": round(float(_extract_next_by_label(team_stats_soup, "Two Point %", i, "two-point-percentage", team_stats_URL).strip('% '))/100, 3),
                        "two-point-attempt-percentage": round((field_goal_attempts - three_point_attempts)/field_goal_attempts, 3),
                    },
                }
            }
            conference_team_stats.append(team_stats_dic)
            if IS_STDIN_JSON_MODE:
                print(i + " done!", file=sys.stderr)
            else:
                print(i + " done!")
        except Exception as err:
            raise RuntimeError(
                f"Team '{i}' failed with list-name '{list_name}': {err}"
            ) from err

    # return data
    return_data = jsonify(conference_team_stats)
    return return_data


###### Create the TEST reciever API POST endpoint ######
@app.route("/test", methods=["POST"])
def test():

    # Convert JSON to Python
    JS_URL_data = request.get_json()

    # Set headers for Soup calls
    headers = requests.utils.default_headers()
    headers.update({
        'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:52.0) Gecko/20100101 Firefox/52.0',
    })

    # get team colors
    for count, i in enumerate(JS_URL_data.keys()):
        team_colors_URL = JS_URL_data.get(i, {}).get("team-colors-URL")
        team_colors_page = requests.get(team_colors_URL, headers=headers)
        team_colors_soup = BeautifulSoup(team_colors_page.content,"html.parser")
        color_block_el = team_colors_soup.find_all("div", attrs={"class": "colorblock"})
        primary_attr_content= color_block_el[0]['style']
        print(re.search(r'#[0-9a-fA-F]{6}', primary_attr_content).group(0))
        if len(color_block_el[1]['class']) > 1:
            if color_block_el[1]['class'][1] == 'white':
                print(color_block_el[1]['class'][1])
            elif color_block_el[1]['class'][1] == 'black':
                print(color_block_el[1]['class'][1])
        else:
            secondary_attr_content = color_block_el[1]['style']
            print(re.search(r'#[0-9a-fA-F]{6}', secondary_attr_content).group(0))

        # print(re.match(r'black', color_block_el[1]['class']))
        # print(re.search(r'#[0-9a-fA-F]{6}', attr_content).group(0))
        
        

     # return data
    
    return 'test done'


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--stdin-json":
        try:
            IS_STDIN_JSON_MODE = True
            payload = json.loads(sys.stdin.read() or "{}")
            with app.test_request_context("/ncaa-stats", method="POST", json=payload):
                response = ncaa_stats()
            print(response.get_data(as_text=True))
        except Exception as err:
            print(str(err), file=sys.stderr)
            sys.exit(1)
    else:
        app.run(debug=True)



