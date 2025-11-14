import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Copy, Users, Gift, Check } from "lucide-react";
import { toast } from "sonner";

const Referral = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [referralCode, setReferralCode] = useState("");
  const [referrals, setReferrals] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [inputCode, setInputCode] = useState("");

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
    loadReferralData(session.user.id);
  };

  const loadReferralData = async (userId: string) => {
    // Get user's own referral code (unused ones only for display)
    const { data: existingReferral } = await supabase
      .from("user_referrals")
      .select("*")
      .eq("referrer_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingReferral) {
      setReferralCode(existingReferral.referral_code);
    } else {
      // Generate new referral code
      const code = generateReferralCode();
      const { data, error } = await supabase
        .from("user_referrals")
        .insert({
          referrer_id: userId,
          referral_code: code,
        })
        .select()
        .single();

      if (data && !error) {
        setReferralCode(data.referral_code);
      }
    }

    // Load referral history
    const { data: refs } = await supabase
      .from("user_referrals")
      .select("*")
      .eq("referrer_id", userId)
      .order("created_at", { ascending: false });

    setReferrals(refs || []);
  };

  const generateReferralCode = () => {
    return `TTT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  };

  const copyReferralCode = () => {
    const referralLink = `${window.location.origin}?ref=${referralCode}`;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const redeemReferralCode = async () => {
    if (!inputCode.trim()) {
      toast.error("Please enter a referral code");
      return;
    }

    if (!user) return;

    // Find referral
    const { data: referral, error: findError } = await supabase
      .from("user_referrals")
      .select("*")
      .eq("referral_code", inputCode.toUpperCase())
      .eq("used", false)
      .maybeSingle();

    if (findError || !referral) {
      toast.error("Invalid or already used referral code");
      return;
    }

    if (referral.referrer_id === user.id) {
      toast.error("You cannot use your own referral code");
      return;
    }

    // Check if user already has premium or active trial
    const { data: existingTrial } = await supabase
      .from("premium_trials")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (existingTrial) {
      toast.error("You already have an active premium trial");
      return;
    }

    // Mark referral as used
    const { error: updateError } = await supabase
      .from("user_referrals")
      .update({
        used: true,
        referred_id: user.id,
        used_at: new Date().toISOString(),
      })
      .eq("id", referral.id);

    if (updateError) {
      toast.error("Failed to redeem referral code");
      return;
    }

    // Create 3-day premium trial for user
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 3);

    await supabase
      .from("premium_trials")
      .insert({
        user_id: user.id,
        trial_end_date: trialEndDate.toISOString(),
        trial_source: "referral",
      });

    // Grant premium role temporarily
    await supabase
      .from("user_roles")
      .insert({
        user_id: user.id,
        role: "premium",
      });

    // Give referrer a 3-day trial too
    const { data: referrerTrials } = await supabase
      .from("premium_trials")
      .select("*")
      .eq("user_id", referral.referrer_id)
      .eq("is_active", true);

    if (!referrerTrials || referrerTrials.length === 0) {
      await supabase
        .from("premium_trials")
        .insert({
          user_id: referral.referrer_id,
          trial_end_date: trialEndDate.toISOString(),
          trial_source: "referral_reward",
        });

      await supabase
        .from("user_roles")
        .insert({
          user_id: referral.referrer_id,
          role: "premium",
        });
    }

    toast.success("🎉 Referral redeemed! You now have 3 days of premium access!");
    setInputCode("");
  };

  const usedReferrals = referrals.filter(r => r.used).length;

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
            <Gift className="h-8 w-8 text-primary" />
            Referral Program
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ajak Teman, Dapat Premium!</CardTitle>
            <CardDescription>
              Bagikan kode referral kamu dan dapatkan 3 hari premium gratis untuk setiap teman yang mendaftar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Your Referral Code */}
            <div>
              <label className="text-sm font-medium mb-2 block">Kode Referral Kamu</label>
              <div className="flex gap-2">
                <Input
                  value={referralCode}
                  readOnly
                  className="font-mono text-lg"
                />
                <Button onClick={copyReferralCode} className="gap-2">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied!" : "Copy Link"}
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{usedReferrals}</p>
                <p className="text-sm text-muted-foreground">Successful Referrals</p>
              </div>
              <div className="p-4 rounded-lg bg-muted text-center">
                <Gift className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{usedReferrals * 3}</p>
                <p className="text-sm text-muted-foreground">Days Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Redeem Code */}
        <Card>
          <CardHeader>
            <CardTitle>Punya Kode Referral?</CardTitle>
            <CardDescription>
              Masukkan kode referral untuk mendapatkan 3 hari premium gratis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Masukkan kode referral (e.g., TTT-ABC123)"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                className="font-mono"
              />
              <Button onClick={redeemReferralCode}>
                Redeem
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* How it works */}
        <Card>
          <CardHeader>
            <CardTitle>Cara Kerja</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Bagikan link referral kamu ke teman-teman</li>
              <li>Ketika teman mendaftar menggunakan link kamu, mereka mendapat 3 hari premium gratis</li>
              <li>Kamu juga mendapat 3 hari premium gratis sebagai reward</li>
              <li>Tidak ada batas jumlah referral yang bisa kamu buat!</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Referral;
