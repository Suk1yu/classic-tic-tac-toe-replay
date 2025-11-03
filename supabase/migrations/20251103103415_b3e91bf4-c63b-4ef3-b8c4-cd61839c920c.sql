-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.payment_transactions CASCADE;
DROP TABLE IF EXISTS public.payment_methods CASCADE;

-- Create payment_methods table
CREATE TABLE public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL, -- 'ewallet', 'bank', 'crypto'
  account_number text NOT NULL,
  account_name text NOT NULL,
  instructions text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create payment_transactions table
CREATE TABLE public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_method_id uuid NOT NULL REFERENCES public.payment_methods(id),
  amount numeric(10,2) NOT NULL,
  proof_url text,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Payment methods are public (everyone can view)
CREATE POLICY "Anyone can view active payment methods"
  ON public.payment_methods
  FOR SELECT
  USING (is_active = true);

-- Payment transactions policies
CREATE POLICY "Users can view own transactions"
  ON public.payment_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON public.payment_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Storage policies for payment proofs
CREATE POLICY "Users can upload own payment proofs"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'payment-proofs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own payment proofs"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'payment-proofs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Add trigger for updated_at
CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default payment methods with Rp 3.500 price info
INSERT INTO public.payment_methods (name, type, account_number, account_name, instructions)
VALUES 
  ('Dana', 'ewallet', '081234567890', 'TicTacToe Premium', 'Transfer Rp 3.500 ke nomor Dana: 081234567890 a.n. TicTacToe Premium. Upload bukti transfer setelah pembayaran.'),
  ('Bank Jago', 'bank', '1234567890', 'TicTacToe Premium', 'Transfer Rp 3.500 ke Bank Jago: 1234567890 a.n. TicTacToe Premium. Upload bukti transfer setelah pembayaran.'),
  ('USDT (TRC20)', 'crypto', 'TXyz123...', 'TicTacToe Premium', 'Transfer setara Rp 3.500 dalam USDT (TRC20) ke alamat: TXyz123... Upload bukti transaksi (TxID) setelah pembayaran.');