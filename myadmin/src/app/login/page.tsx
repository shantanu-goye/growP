"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/hooks/use-toast";

export default function LoginPage() {
  const [step, setStep] = useState<"login" | "otp">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    const res = await fetch("https://app.growp.in/api/v1/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (res.ok) {
      toast({ title: "OTP Sent", description: "Check your email for the OTP." });
      setStep("otp");
    } else {
      toast({ title: "Login Failed", description: data.message });
    }
  };

  const handleVerifyOtp = async () => {
    const res = await fetch("https://app.growp.in/api/v1/admin/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });

    const data = await res.json();

    if (res.ok && data.token) {
    localStorage.setItem("authToken", data.token); // <-- use authToken here
    toast({ title: "Login Successful" });
    router.push("/");
    }
    else {
      toast({ title: "OTP Verification Failed", description: data.message });
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-20 space-y-6">
      <h1 className="text-2xl font-bold text-center">Admin Login</h1>

      {step === "login" ? (
        <>
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button onClick={handleLogin} className="w-full">Send OTP</Button>
        </>
      ) : (
        <>
          <div>
            <Label>OTP</Label>
            <Input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} />
          </div>
          <Button onClick={handleVerifyOtp} className="w-full">Verify OTP</Button>
        </>
      )}
    </div>
  );
}
