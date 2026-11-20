CREATE TABLE `form_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`form_key` varchar(60) NOT NULL,
	`notify_email` varchar(255) NOT NULL DEFAULT '',
	`send_confirmation` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `form_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `form_settings_form_key_unique` UNIQUE(`form_key`)
);
--> statement-breakpoint
CREATE TABLE `form_submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`form_key` varchar(60) NOT NULL,
	`data` json NOT NULL,
	`read_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `form_submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `form_submissions_listing_idx` ON `form_submissions` (`form_key`,`created_at`);