-- Accept timestamps, so accepted-answer points attribute to when the accept
-- happened (not when the reply was written) in time-windowed leaderboards.
alter table replies add column accepted_at timestamptz;
update replies set accepted_at = created_at where accepted;
