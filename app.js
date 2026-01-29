/* OFFLINE (BarcodeDetector) – 1 scan = 1 code
   - Liste visible des derniers scans
   - Bip aigu (nouveau) / bip grave (doublon)
   - Le bouton devient "📷 Scanner le suivant" après chaque scan
*/
const startBtn=document.getElementById("startBtn");
const stopBtn=document.getElementById("stopBtn");
const resetBtn=document.getElementById("resetBtn");
const messageBox=document.getElementById("messageBox");
const countEl=document.getElementById("count");
const lastCodeEl=document.getElementById("lastCode");
const readerWrap=document.getElementById("readerWrap");
const video=document.getElementById("video");
const recentList=document.getElementById("recentList");

let scanning=false,stream=null,detector=null,rafId=null;
let lastHitValue="",lastHitAt=0;
const SAME_CODE_COOLDOWN_MS=800;

const codes=new Set();
let count=0;

function setMessage(type,html){
  messageBox.classList.remove("neutral","ok","warn");
  messageBox.classList.add(type);
  messageBox.innerHTML=html;
}
function beep(freq,dur){
  try{
    const c=new (window.AudioContext||window.webkitAudioContext)();
    const o=c.createOscillator(); const g=c.createGain();
    o.type="sine"; o.frequency.value=freq;
    o.connect(g); g.connect(c.destination); g.gain.value=0.08;
    o.start(); setTimeout(()=>{ o.stop(); c.close(); }, dur);
  }catch(e){}
}
function beepNew(){ beep(950,110); }
function beepDup(){ beep(320,160); }

function pushRecent(code,status){
  const li=document.createElement("li");
  const left=document.createElement("div");
  left.textContent=code;
  left.style.wordBreak="break-all";
  const badge=document.createElement("span");
  badge.className="badge "+(status==="ok"?"ok":"warn");
  badge.textContent=status==="ok"?"NOUVEAU":"DOUBLON";
  li.appendChild(left); li.appendChild(badge);
  recentList.prepend(li);
  while(recentList.children.length>10){
    recentList.removeChild(recentList.lastChild);
  }
}

function stopScan(){
  if(rafId) cancelAnimationFrame(rafId);
  rafId=null;

  if(stream){
    stream.getTracks().forEach(t=>t.stop());
  }
  stream=null;
  detector=null;
  scanning=false;

  // reset anti-rafale pour pouvoir rescanner le même code ensuite
  lastHitValue=""; lastHitAt=0;

  readerWrap.classList.add("hidden");
  startBtn.disabled=false;
  stopBtn.disabled=true;

  startBtn.textContent="📷 Scanner le suivant";
  setMessage("neutral","Arrêté. Appuie sur 📷 Scanner pour le suivant.");
}

async function handleCode(code){
  const c=String(code||"").trim();
  if(!c) return;

  const isDup = codes.has(c);

  if(isDup){
    setMessage("warn",`⚠️ <b>Doublon détecté</b><br><span class="small">${c}</span>`);
    beepDup();
    pushRecent(c,"warn");
  }else{
    codes.add(c);
    count++;
    countEl.textContent=String(count);
    lastCodeEl.textContent=c;
    setMessage("ok",`✅ <b>Code valide – nouveau</b><br><span class="small">${c}</span>`);
    beepNew();
    pushRecent(c,"ok");
  }

  // 1 scan = 1 code
  stopScan();
}

async function scanFrame(){
  if(!scanning) return;

  try{
    const r = await detector.detect(video);
    if(r && r.length){
      const v = r[0].rawValue || "";
      const now = performance.now();
      if(v && (v!==lastHitValue || (now-lastHitAt)>SAME_CODE_COOLDOWN_MS)){
        lastHitValue=v; lastHitAt=now;
        await handleCode(v);
        return;
      }
    }
  }catch(e){}

  rafId=requestAnimationFrame(scanFrame);
}

async function startScan(){
  if(scanning) return;

  if(!('BarcodeDetector' in window)){
    setMessage("warn","❌ BarcodeDetector non supporté sur ce navigateur/appareil.");
    return;
  }

  try{
    detector=new BarcodeDetector();
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    video.srcObject=stream;
    await video.play();

    scanning=true;
    readerWrap.classList.remove("hidden");
    startBtn.disabled=true;
    stopBtn.disabled=false;
    setMessage("neutral","📷 Scanne un code-barres");
    rafId=requestAnimationFrame(scanFrame);
  }catch(err){
    setMessage("warn","❌ Impossible de démarrer la caméra.");
    stopScan();
  }
}

startBtn.addEventListener("click", startScan);
stopBtn.addEventListener("click", stopScan);

resetBtn.addEventListener("click", ()=>{
  if(scanning) return;
  codes.clear();
  count=0;
  countEl.textContent="0";
  lastCodeEl.textContent="—";
  recentList.innerHTML="";
  startBtn.textContent="📷 Scanner un code-barres";
  setMessage("neutral","Liste réinitialisée. Prêt à scanner.");
});
