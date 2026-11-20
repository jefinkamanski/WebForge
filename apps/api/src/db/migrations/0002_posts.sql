CREATE TABLE `posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(160) NOT NULL,
	`title` varchar(160) NOT NULL,
	`excerpt` varchar(300) NOT NULL DEFAULT '',
	`content` json NOT NULL,
	`cover_media_id` int,
	`seo_title` varchar(70) NOT NULL DEFAULT '',
	`seo_description` varchar(160) NOT NULL DEFAULT '',
	`status` enum('draft','published') NOT NULL DEFAULT 'draft',
	`published_at` datetime,
	`deleted_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `posts_id` PRIMARY KEY(`id`),
	CONSTRAINT `posts_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `posts` ADD CONSTRAINT `posts_cover_media_id_media_id_fk` FOREIGN KEY (`cover_media_id`) REFERENCES `media`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `posts_listing_idx` ON `posts` (`status`,`deleted_at`,`published_at`);