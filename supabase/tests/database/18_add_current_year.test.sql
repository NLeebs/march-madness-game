begin;
select plan(7);

select tests.clear_authentication();

select lives_ok($$select stats.add_current_year()$$, 'add_current_year runs');
select is((select count(*) from public.years
           where year = extract(year from now() at time zone 'utc')::int), 1::bigint, 'current year inserted');
select is((select count(*) from public.tournament_scoring_rules r join public.years y on y.id = r.year_id
           where y.year = extract(year from now() at time zone 'utc')::int and r.version = '1.0.0'
             and r.description like 'This bracket is calculated based off of a 64 team bracket%'), 1::bigint, 'rules row inserted');

select lives_ok($$select stats.add_current_year()$$, 'second call runs');
select is((select count(*) from public.years
           where year = extract(year from now() at time zone 'utc')::int), 1::bigint, 'still one year');
select is((select count(*) from public.tournament_scoring_rules r join public.years y on y.id = r.year_id
           where y.year = extract(year from now() at time zone 'utc')::int), 1::bigint, 'still one rules row');

-- pre-existing rules are not overwritten
delete from public.tournament_scoring_rules r using public.years y
  where y.id = r.year_id and y.year = extract(year from now() at time zone 'utc')::int;
insert into public.tournament_scoring_rules (year_id, description, version)
  select id, 'keep', 'keep' from public.years where year = extract(year from now() at time zone 'utc')::int;
select stats.add_current_year();
select is((select r.description from public.tournament_scoring_rules r join public.years y on y.id = r.year_id
           where y.year = extract(year from now() at time zone 'utc')::int), 'keep', 'existing rules kept');

select * from finish();
rollback;
