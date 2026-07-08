import { useState, useEffect } from "react";
import { Shield, ShieldOff, Smartphone, Copy, Check } from "lucide-react";
import { get2faStatus, setup2fa, enable2fa, disable2fa } from "../api";

export function TwoFactorSetup() {
  const [status, setStatus] = useState<{ loading: boolean; enabled: boolean }>({ loading: true, enabled: false });
  const [setupData, setSetupData] = useState<{ secret: string; qr_uri: string; manual_code: string } | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    get2faStatus()
      .then(r => setStatus({ loading: false, enabled: r.is_2fa_enabled }))
      .catch(() => setStatus({ loading: false, enabled: false }));
  }, []);

  const handleSetup = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await setup2fa();
      setSetupData(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleEnable = async () => {
    if (!setupData || code.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      const res = await enable2fa(code);
      setMsg(res.detail);
      setStatus({ loading: false, enabled: true });
      setSetupData(null);
      setCode("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    if (code.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      const res = await disable2fa(code);
      setMsg(res.detail);
      setStatus({ loading: false, enabled: false });
      setCode("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const copySecret = () => {
    if (setupData) {
      navigator.clipboard.writeText(setupData.manual_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (status.loading) return <p style={{color:"var(--muted)",padding:8}}>Loading 2FA status...</p>;

  if (status.enabled) {
    return (
      <div className="office-form">
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <Shield size={20} style={{color:"#10b981"}} />
          <strong>Two-Factor Authentication is Active</strong>
          <span className="badge success">Enabled</span>
        </div>
        {msg && <p className="notice-strip success">{msg}</p>}
        <p style={{fontSize:"0.85rem",color:"var(--muted)",margin:"8px 0"}}>
          To disable 2FA, enter your authenticator app code below:
        </p>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="000000" maxLength={6}
            style={{width:140,textAlign:"center",letterSpacing:4,fontSize:"1.1rem",fontWeight:700,
              border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 8px",background:"rgba(255,255,255,0.05)",color:"#f1f5f9"}} />
          <button className="tool-button danger" onClick={handleDisable} disabled={busy || code.length !== 6}>
            {busy ? "..." : <><ShieldOff size={14}/> Disable</>}
          </button>
        </div>
        {err && <p className="notice-strip error" style={{marginTop:8}}>{err}</p>}
      </div>
    );
  }

  if (setupData) {
    return (
      <div className="office-form">
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <Smartphone size={20} style={{color:"var(--primary)"}} />
          <strong>Scan with Authenticator App</strong>
        </div>
        <p style={{fontSize:"0.85rem",color:"var(--muted)",margin:"8px 0"}}>
          Scan the QR code or enter the code manually in your authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code below.
        </p>
        <div style={{textAlign:"center",padding:16,background:"rgba(255,255,255,0.05)",borderRadius:12,margin:"8px 0"}}>
          <div style={{width:180,height:180,margin:"0 auto",background:"#fff",borderRadius:8,display:"grid",placeItems:"center",fontSize:"0.78rem",color:"#666"}}>
            {/* QR code rendered via data URI — in production use a QR library */}
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(setupData.qr_uri)}`} alt="QR Code" style={{width:180,height:180,borderRadius:8}} />
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,justifyContent:"center",marginBottom:12}}>
          <code style={{fontSize:"0.82rem",color:"var(--muted)",wordBreak:"break-all"}}>{setupData.manual_code}</code>
          <button className="tool-button" style={{minHeight:28,minWidth:28,padding:0}} onClick={copySecret}>
            {copied ? <Check size={14} style={{color:"#10b981"}}/> : <Copy size={14}/>}
          </button>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="000000" maxLength={6}
            style={{width:140,textAlign:"center",letterSpacing:4,fontSize:"1.1rem",fontWeight:700,
              border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 8px",background:"rgba(255,255,255,0.05)",color:"#f1f5f9"}} />
          <button className="tool-button primary" onClick={handleEnable} disabled={busy || code.length !== 6}>
            {busy ? "..." : "Verify & Enable"}
          </button>
          <button className="tool-button" onClick={() => setSetupData(null)}>Cancel</button>
        </div>
        {err && <p className="notice-strip error" style={{marginTop:8}}>{err}</p>}
      </div>
    );
  }

  return (
    <div className="office-form">
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
        <Shield size={20} style={{color:"var(--muted)"}} />
        <strong>Two-Factor Authentication</strong>
        <span className="badge muted">Not Enabled</span>
      </div>
      <p style={{fontSize:"0.85rem",color:"var(--muted)",margin:"8px 0"}}>
        Add an extra layer of security to your account. You'll need to enter a code from your authenticator app when logging in.
      </p>
      <button className="tool-button primary" onClick={handleSetup} disabled={busy}>
        <Smartphone size={15}/> {busy ? "Setting up..." : "Set Up 2FA"}
      </button>
      {err && <p className="notice-strip error" style={{marginTop:8}}>{err}</p>}
    </div>
  );
}
