-- Create user_blocks table
CREATE TABLE public.user_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);

-- Create user_mutes table
CREATE TABLE public.user_mutes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  muter_id UUID NOT NULL,
  muted_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (muter_id, muted_id)
);

-- Create user_reports table
CREATE TABLE public.user_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  reported_id UUID NOT NULL,
  reason TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_blocks
CREATE POLICY "Users can block others"
  ON public.user_blocks
  FOR INSERT
  WITH CHECK (auth.uid() = blocker_id AND auth.uid() != blocked_id);

CREATE POLICY "Users can unblock"
  ON public.user_blocks
  FOR DELETE
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can view their own blocks"
  ON public.user_blocks
  FOR SELECT
  USING (auth.uid() = blocker_id);

CREATE POLICY "Admins can view all blocks"
  ON public.user_blocks
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for user_mutes
CREATE POLICY "Users can mute others"
  ON public.user_mutes
  FOR INSERT
  WITH CHECK (auth.uid() = muter_id AND auth.uid() != muted_id);

CREATE POLICY "Users can unmute"
  ON public.user_mutes
  FOR DELETE
  USING (auth.uid() = muter_id);

CREATE POLICY "Users can view their own mutes"
  ON public.user_mutes
  FOR SELECT
  USING (auth.uid() = muter_id);

CREATE POLICY "Admins can view all mutes"
  ON public.user_mutes
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for user_reports
CREATE POLICY "Users can create reports"
  ON public.user_reports
  FOR INSERT
  WITH CHECK (auth.uid() = reporter_id AND auth.uid() != reported_id);

CREATE POLICY "Users can view their own reports"
  ON public.user_reports
  FOR SELECT
  USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports"
  ON public.user_reports
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reports"
  ON public.user_reports
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Create indexes for better performance
CREATE INDEX idx_user_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX idx_user_blocks_blocked ON public.user_blocks(blocked_id);
CREATE INDEX idx_user_mutes_muter ON public.user_mutes(muter_id);
CREATE INDEX idx_user_mutes_muted ON public.user_mutes(muted_id);
CREATE INDEX idx_user_reports_reporter ON public.user_reports(reporter_id);
CREATE INDEX idx_user_reports_reported ON public.user_reports(reported_id);
CREATE INDEX idx_user_reports_status ON public.user_reports(status);