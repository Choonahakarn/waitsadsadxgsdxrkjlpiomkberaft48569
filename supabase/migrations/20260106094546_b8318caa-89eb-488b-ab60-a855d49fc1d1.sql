-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artwork_id UUID NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

-- Enable Row Level Security
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Reviews are publicly viewable" 
ON public.reviews 
FOR SELECT 
USING (true);

CREATE POLICY "Buyers can create reviews for their orders" 
ON public.reviews 
FOR INSERT 
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Buyers can update their own reviews" 
ON public.reviews 
FOR UPDATE 
USING (auth.uid() = buyer_id);

CREATE POLICY "Buyers can delete their own reviews" 
ON public.reviews 
FOR DELETE 
USING (auth.uid() = buyer_id);

-- Create indexes
CREATE INDEX idx_reviews_artwork_id ON public.reviews(artwork_id);
CREATE INDEX idx_reviews_buyer_id ON public.reviews(buyer_id);

-- Create trigger for updated_at
CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();