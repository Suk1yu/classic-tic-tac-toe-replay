import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield, CheckCircle, XCircle, Eye, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Transaction {
  id: string;
  user_id: string;
  status: string;
  amount: number;
  created_at: string;
  proof_url: string;
  payment_methods: {
    name: string;
  };
  user_email?: string;
}

const Admin = () => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);

    // Check if user has admin role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      toast.error("Akses ditolak. Anda bukan admin.");
      navigate("/");
      return;
    }

    setIsAdmin(true);
    fetchTransactions();
  };

  const fetchTransactions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("payment_transactions")
      .select(`
        *,
        payment_methods (name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Gagal memuat transaksi");
      console.error(error);
    } else {
      // Fetch user emails separately
      const transactionsWithEmails = await Promise.all(
        (data || []).map(async (tx) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", tx.user_id)
            .single();
          
          return {
            ...tx,
            user_email: profile?.email || "Unknown"
          };
        })
      );
      setTransactions(transactionsWithEmails);
    }
    setLoading(false);
  };

  const handleApprove = async (transactionId: string, userId: string) => {
    try {
      // Update transaction status
      const { error: txError } = await supabase
        .from("payment_transactions")
        .update({ status: "approved" })
        .eq("id", transactionId);

      if (txError) throw txError;

      // Update user role to premium
      const { error: roleError } = await supabase
        .from("profiles")
        .update({ role: "premium" })
        .eq("id", userId);

      if (roleError) throw roleError;

      // Insert premium role to user_roles (using upsert to avoid duplicates)
      const { error: userRoleError } = await supabase
        .from("user_roles")
        .upsert({ user_id: userId, role: "premium" }, { onConflict: "user_id,role" });

      if (userRoleError) throw userRoleError;

      toast.success("Pembayaran disetujui!");
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleReject = async (transactionId: string) => {
    try {
      const { error } = await supabase
        .from("payment_transactions")
        .update({ status: "rejected" })
        .eq("id", transactionId);

      if (error) throw error;

      toast.success("Pembayaran ditolak");
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const viewProof = async (proofUrl: string) => {
    const { data } = await supabase.storage
      .from("payment-proofs")
      .getPublicUrl(proofUrl);

    setSelectedProof(data.publicUrl);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Disetujui</span>;
      case "rejected":
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">Ditolak</span>;
      default:
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">Pending</span>;
    }
  };

  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Admin Panel
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Verifikasi Pembayaran</CardTitle>
            <CardDescription>
              Kelola dan verifikasi pembayaran premium dari pengguna
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Memuat transaksi...</p>
            ) : transactions.length === 0 ? (
              <p className="text-muted-foreground">Tidak ada transaksi</p>
            ) : (
              <div className="space-y-4">
                {transactions.map((tx) => (
                  <Card key={tx.id}>
                    <CardContent className="pt-6">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm font-semibold">Email</p>
                            <p className="text-sm text-muted-foreground">{tx.user_email}</p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold">Metode Pembayaran</p>
                            <p className="text-sm text-muted-foreground">{tx.payment_methods.name}</p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold">Jumlah</p>
                            <p className="text-sm text-muted-foreground">Rp {tx.amount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold">Tanggal</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(tx.created_at).toLocaleString("id-ID")}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold">Status</p>
                            {getStatusBadge(tx.status)}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => viewProof(tx.proof_url)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Lihat Bukti Pembayaran
                          </Button>

                          {tx.status === "pending" && (
                            <div className="flex gap-2">
                              <Button
                                variant="default"
                                className="flex-1"
                                onClick={() => handleApprove(tx.id, tx.user_id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Setujui
                              </Button>
                              <Button
                                variant="destructive"
                                className="flex-1"
                                onClick={() => handleReject(tx.id)}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Tolak
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedProof} onOpenChange={() => setSelectedProof(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Bukti Pembayaran</DialogTitle>
          </DialogHeader>
          {selectedProof && (
            <img
              src={selectedProof}
              alt="Bukti pembayaran"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
