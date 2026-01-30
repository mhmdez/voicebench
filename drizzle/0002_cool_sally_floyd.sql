CREATE TABLE `scenarios` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`prompt` text NOT NULL,
	`prompt_audio_url` text,
	`expected_outcome` text NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`language` text DEFAULT 'en' NOT NULL,
	`difficulty` text DEFAULT 'medium' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `eval_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`provider_ids` text NOT NULL,
	`scenario_ids` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`progress` real DEFAULT 0 NOT NULL,
	`started_at` integer,
	`completed_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `eval_results` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`scenario_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`audio_url` text,
	`transcript` text,
	`ttfb` real,
	`total_response_time` real,
	`wer` real,
	`accuracy_score` real,
	`helpfulness_score` real,
	`naturalness_score` real,
	`efficiency_score` real,
	`judge_reasoning` text,
	`task_completed` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `eval_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`scenario_id`) REFERENCES `scenarios`(`id`) ON UPDATE no action ON DELETE no action
);
