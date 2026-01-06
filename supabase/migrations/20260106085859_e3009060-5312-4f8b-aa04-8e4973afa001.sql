-- Create orders table for purchases
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID NOT NULL,
  artwork_id UUID NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES public.artist_profiles(id),
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Order policies
CREATE POLICY "Buyers can view their own orders"
ON public.orders FOR SELECT
USING (auth.uid() = buyer_id);

CREATE POLICY "Artists can view orders for their artworks"
ON public.orders FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.artist_profiles 
  WHERE artist_profiles.id = orders.artist_id 
  AND artist_profiles.user_id = auth.uid()
));

CREATE POLICY "Admins can view all orders"
ON public.orders FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert orders"
ON public.orders FOR INSERT
WITH CHECK (auth.uid() = buyer_id);

-- Function to handle artwork purchase
CREATE OR REPLACE FUNCTION public.purchase_artwork(
  p_artwork_id UUID,
  p_buyer_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_artwork RECORD;
  v_wallet RECORD;
  v_order_id UUID;
BEGIN
  -- Get artwork details
  SELECT * INTO v_artwork FROM artworks WHERE id = p_artwork_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'ไม่พบผลงานนี้');
  END IF;
  
  IF v_artwork.is_sold = true THEN
    RETURN json_build_object('success', false, 'error', 'ผลงานนี้ถูกขายไปแล้ว');
  END IF;
  
  -- Get buyer's wallet
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_buyer_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'ไม่พบกระเป๋าเงิน');
  END IF;
  
  IF v_wallet.balance < v_artwork.price THEN
    RETURN json_build_object('success', false, 'error', 'ยอดเงินไม่เพียงพอ กรุณาเติมเงิน');
  END IF;
  
  -- Deduct from wallet
  UPDATE wallets 
  SET balance = balance - v_artwork.price 
  WHERE id = v_wallet.id;
  
  -- Create order
  INSERT INTO orders (buyer_id, artwork_id, artist_id, amount)
  VALUES (p_buyer_id, p_artwork_id, v_artwork.artist_id, v_artwork.price)
  RETURNING id INTO v_order_id;
  
  -- Create transaction record
  INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id)
  VALUES (v_wallet.id, 'purchase', -v_artwork.price, 'ซื้อผลงาน: ' || v_artwork.title, v_order_id);
  
  -- Mark artwork as sold
  UPDATE artworks SET is_sold = true WHERE id = p_artwork_id;
  
  RETURN json_build_object(
    'success', true, 
    'order_id', v_order_id,
    'message', 'ซื้อผลงานสำเร็จ!'
  );
END;
$$;