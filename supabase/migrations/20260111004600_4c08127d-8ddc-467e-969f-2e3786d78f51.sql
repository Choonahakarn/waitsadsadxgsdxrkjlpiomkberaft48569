-- Fix race condition in purchase_artwork by adding row-level locking
CREATE OR REPLACE FUNCTION public.purchase_artwork(p_artwork_id uuid, p_buyer_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_artwork RECORD;
  v_wallet RECORD;
  v_artist_profile RECORD;
  v_artist_wallet RECORD;
  v_order_id UUID;
BEGIN
  -- CRITICAL: Lock the artwork row to prevent concurrent purchases
  -- FOR UPDATE NOWAIT will immediately fail if another transaction has the lock
  SELECT * INTO v_artwork 
  FROM artworks 
  WHERE id = p_artwork_id 
  FOR UPDATE NOWAIT;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'ไม่พบผลงานนี้');
  END IF;
  
  -- Check if already sold (after acquiring lock)
  IF v_artwork.is_sold = true THEN
    RETURN json_build_object('success', false, 'error', 'ผลงานนี้ถูกขายไปแล้ว');
  END IF;
  
  -- Get artist profile (needed for wallet lookup)
  SELECT * INTO v_artist_profile FROM artist_profiles WHERE id = v_artwork.artist_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'ไม่พบข้อมูลศิลปิน');
  END IF;
  
  -- Lock buyer's wallet to prevent concurrent balance modifications
  SELECT * INTO v_wallet 
  FROM wallets 
  WHERE user_id = p_buyer_id 
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'ไม่พบกระเป๋าเงิน');
  END IF;
  
  IF v_wallet.balance < v_artwork.price THEN
    RETURN json_build_object('success', false, 'error', 'ยอดเงินไม่เพียงพอ กรุณาเติมเงิน');
  END IF;
  
  -- Lock artist's wallet to prevent concurrent modifications
  SELECT * INTO v_artist_wallet
  FROM wallets 
  WHERE user_id = v_artist_profile.user_id 
  FOR UPDATE;
  
  -- Deduct from buyer wallet
  UPDATE wallets 
  SET balance = balance - v_artwork.price 
  WHERE id = v_wallet.id;
  
  -- Add to artist wallet
  UPDATE wallets 
  SET balance = balance + v_artwork.price 
  WHERE user_id = v_artist_profile.user_id;
  
  -- Create order
  INSERT INTO orders (buyer_id, artwork_id, artist_id, amount)
  VALUES (p_buyer_id, p_artwork_id, v_artwork.artist_id, v_artwork.price)
  RETURNING id INTO v_order_id;
  
  -- Create buyer transaction record
  INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id)
  VALUES (v_wallet.id, 'purchase', -v_artwork.price, 'ซื้อผลงาน: ' || v_artwork.title, v_order_id);
  
  -- Create artist income transaction record
  INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id)
  SELECT w.id, 'income', v_artwork.price, 'ขายผลงาน: ' || v_artwork.title, v_order_id
  FROM wallets w WHERE w.user_id = v_artist_profile.user_id;
  
  -- Mark artwork as sold
  UPDATE artworks SET is_sold = true WHERE id = p_artwork_id;
  
  -- Send notification to artist
  INSERT INTO notifications (user_id, title, message, type, reference_id)
  VALUES (
    v_artist_profile.user_id,
    'ยินดีด้วย! ผลงานของคุณถูกขายแล้ว 🎉',
    'ผลงาน "' || v_artwork.title || '" ถูกซื้อในราคา ฿' || v_artwork.price::text || ' เงินได้เข้ากระเป๋าเรียบร้อยแล้ว',
    'success',
    v_order_id
  );
  
  RETURN json_build_object(
    'success', true, 
    'order_id', v_order_id,
    'message', 'ซื้อผลงานสำเร็จ!'
  );

EXCEPTION
  WHEN lock_not_available THEN
    -- Another transaction is currently purchasing this artwork
    RETURN json_build_object('success', false, 'error', 'ผลงานนี้กำลังถูกซื้อโดยผู้อื่น กรุณาลองใหม่');
  WHEN OTHERS THEN
    -- Re-raise other unexpected exceptions
    RAISE;
END;
$function$;