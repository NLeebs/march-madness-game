import requests
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
from bs4 import BeautifulSoup

###### Set up Flask App ######
app = Flask(__name__)
cors = CORS(app)

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

    # Use Team Stats URL to construct dictionary
    conference_team_stats = []
    for count, i in enumerate(JS_URL_data.keys()):
        # # Wait to bypass API
        # if (count%3 == 0 and count!= 0):
        #     randInt = random.randint(5,10)
        #     time.sleep(randInt)

        # get team strenght of schedule
        if JS_URL_data.get(i, {}).get("list-name"):
            list_name = JS_URL_data.get(i, {}).get("list-name")
        else:
            list_name = i
        strenght_of_schedule = strenght_of_schedule_soup.find("td", attrs={"data-sort": list_name}).findPrevious("td").contents[0]
    
        # get team possessions
        team_possessions = team_possessions_soup.find("td", attrs={"data-sort": list_name}).findNext("td").contents[0]

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
        field_goal_attempts = float(team_stats_soup.find("td", string="FGA/Game").findNext('td').contents[0].strip(' '))
        three_point_attempts = float(team_stats_soup.find("td", string="3PA/Game").findNext('td').contents[0].strip(' '))

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
               "primary-color": team_primary_color,
               "secondary-color": team_secondary_color,
               "stats-defense": {
                    "cause-turnover-percentage": round(float(team_stats_soup.find("td", string="Opp Turnovers/Play").findNext('td').contents[0].strip('% '))/100, 3),
                    "commit-foul-percentage": round(float(team_stats_soup.find("td", string="Personal Fouls/Play").findNext('td').contents[0].strip('% '))/100, 3),
                    "defensive-rebound-percentage": round(float(team_stats_soup.find("td", string="Def Rebound %").findNext('td').contents[0].strip('% '))/100, 3),
                    "opp-three-point-percentage": round(float(team_stats_soup.find("td", string="Opp Three Point %").findNext('td').contents[0].strip('% '))/100, 3),
                    "opp-two-point-percentage": round(float(team_stats_soup.find("td", string="Opp Two Point %").findNext('td').contents[0].strip('% '))/100, 3),
                },
                "stats-offensive": {
                    "draw-foul-percentage": round(float(team_stats_soup.find("td", string="Opp Personal Fouls/Play").findNext('td').contents[0].strip('% '))/100, 3),
                    "free-throw-percentage": round(float(team_stats_soup.find("td", string="Free Throw %").findNext('td').contents[0].strip('% '))/100, 3),
                    "offensive-rebound-percentage": round(float(team_stats_soup.find("td", string="Off Rebound %").findNext('td').contents[0].strip('% '))/100, 3),
                    "three-point-percentage": round(float(team_stats_soup.find("td", string="Three Point %").findNext('td').contents[0].strip('% '))/100, 3),
                    "two-point-percentage": round(float(team_stats_soup.find("td", string="Two Point %").findNext('td').contents[0].strip('% '))/100, 3),
                    "two-point-attempt-percentage": round((field_goal_attempts - three_point_attempts)/field_goal_attempts, 3),
                },
            }
        }
        conference_team_stats.append(team_stats_dic)
        print(i + " done!")

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
    app.run(debug=True)



