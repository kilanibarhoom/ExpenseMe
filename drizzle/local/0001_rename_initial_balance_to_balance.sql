ALTER TABLE `accounts` RENAME COLUMN `initial_balance` TO `balance`;
--> statement-breakpoint
UPDATE `accounts`
SET `balance` = `balance`
  + COALESCE((SELECT SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END)
              FROM `transactions` t WHERE t.account_id = accounts.id), 0)
  + COALESCE((SELECT SUM(tr.to_amount) FROM `transfers` tr WHERE tr.to_account_id = accounts.id), 0)
  - COALESCE((SELECT SUM(tr.from_amount) FROM `transfers` tr WHERE tr.from_account_id = accounts.id), 0);
