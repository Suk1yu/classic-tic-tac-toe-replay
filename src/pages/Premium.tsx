import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Crown, Upload, CheckCircle, Clock, XCircle, ArrowLeft } from "lucide-react";

interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  account_number: string;
  account_name: string;
  instructions: string;
}

interface Transaction {
  id: string;
  status: string;
  amount: number;
  created_at: string;
  payment_methods: {
    name: string;
  };
}

const Premium = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchPaymentMethods();
    fetchTransactions();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();
    
    // Check if user has premium role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "premium");

    // Set profile with premium status from user_roles
    setProfile({
      ...profileData,
      isPremium: roles && roles.length > 0
    });
  };

  const fetchPaymentMethods = async () => {
    const { data } = await supabase
      .from("payment_methods")
      .select("*")
      .eq("is_active", true);
    
    if (data) setPaymentMethods(data);
  };

  const fetchTransactions = async () => {
    const { data } = await supabase
      .from("payment_transactions")
      .select(`
        *,
        payment_methods (name)
      `)
      .order("created_at", { ascending: false })
      .limit(5);
    
    if (data) setTransactions(data);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !selectedMethod || !user) return;

    setUploading(true);
    const file = e.target.files[0];

    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create transaction record
      const { error: insertError } = await supabase
        .from("payment_transactions")
        .insert({
          user_id: user.id,
          payment_method_id: selectedMethod.id,
          amount: 3500,
          proof_url: fileName,
          status: "pending",
        });

      if (insertError) throw insertError;

      toast.success("Bukti pembayaran berhasil diupload! Menunggu verifikasi.");
      setSelectedMethod(null);
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "approved":
        return "Disetujui";
      case "rejected":
        return "Ditolak";
      default:
        return "Menunggu";
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Crown className="h-8 w-8 text-yellow-500" />
            Premium Membership
          </h1>
        </div>

        {profile?.isPremium ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-500" />
                Anda Sudah Premium!
              </CardTitle>
              <CardDescription>
                Nikmati fitur unlimited undo dan achievements eksklusif
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Upgrade ke Premium</CardTitle>
                <CardDescription>
                  Hanya Rp 3.500/bulan - Dapatkan unlimited undo dan achievements eksklusif
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {paymentMethods.map((method) => (
                    <Card
                      key={method.id}
                      className={`cursor-pointer transition-all ${
                        selectedMethod?.id === method.id
                          ? "ring-2 ring-primary"
                          : "hover:border-primary"
                      }`}
                      onClick={() => setSelectedMethod(method)}
                    >
                      <CardHeader>
                        <CardTitle className="text-lg">{method.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <p className="font-mono">{method.account_number}</p>
                        <p className="text-muted-foreground">{method.account_name}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {selectedMethod && (
                  <div className="mt-6 space-y-4 border-t pt-4">
                    <div className="rounded-lg bg-muted p-4">
                      <p className="text-sm font-semibold mb-2">Instruksi Pembayaran:</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {selectedMethod.instructions}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="proof">Upload Bukti Pembayaran</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="proof"
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          disabled={uploading}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={uploading}
                          asChild
                        >
                          <label htmlFor="proof" className="cursor-pointer">
                            <Upload className="h-4 w-4" />
                          </label>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {transactions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Riwayat Transaksi</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          {getStatusIcon(tx.status)}
                          <div>
                            <p className="font-medium">{tx.payment_methods.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Rp {tx.amount.toLocaleString()} • {new Date(tx.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-medium">
                          {getStatusText(tx.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Premium;
