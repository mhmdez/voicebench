CREATE TABLE `prompts` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`text` text NOT NULL,
	`audio_url` text,
	`language` text DEFAULT 'en' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` text PRIMARY KEY NOT NULL,
	`prompt_id` text NOT NULL,
	`category` text NOT NULL,
	`provider_a_id` text NOT NULL,
	`provider_b_id` text NOT NULL,
	`response_a_url` text,
	`response_b_url` text,
	`response_a_latency` real,
	`response_b_latency` real,
	`created_at` integer NOT NULL,
	`voted_at` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`prompt_id`) REFERENCES `prompts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `votes` (
	`id` text PRIMARY KEY NOT NULL,
	`match_id` text NOT NULL,
	`winner` text NOT NULL,
	`session_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE no action
);
