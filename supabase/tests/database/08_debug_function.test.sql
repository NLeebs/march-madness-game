begin;
select plan(1);

select hasnt_function('public', 'debug_auth_context', 'leftover debug RPC is removed');

select * from finish();
rollback;
