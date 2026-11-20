CREATE TABLE `media` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kind` enum('image','video') NOT NULL,
	`storage_key` varchar(255) NOT NULL,
	`mime` varchar(50) NOT NULL,
	`size` int NOT NULL,
	`width` int,
	`height` int,
	`alt` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `media_id` PRIMARY KEY(`id`),
	CONSTRAINT `media_storage_key_unique` UNIQUE(`storage_key`)
);
--> statement-breakpoint
CREATE TABLE `site_sections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(60) NOT NULL,
	`content` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `site_sections_id` PRIMARY KEY(`id`),
	CONSTRAINT `site_sections_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE INDEX `media_kind_idx` ON `media` (`kind`);