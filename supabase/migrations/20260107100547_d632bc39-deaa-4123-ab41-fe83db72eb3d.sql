-- Add is_clicked column to track if notification item was actually viewed
ALTER TABLE public.notifications
ADD COLUMN is_clicked BOOLEAN NOT NULL DEFAULT false;