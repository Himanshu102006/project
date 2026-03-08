let port;
let writer;
let buffer = "";
let currentOTP = null;
let otpVerified = false;
let lockActive = false;

// User email for OTP
let userEmail = "himanshudhanda0001@gmail.com"; // replace with actual email

async function connectSerial() {
  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 });

    const encoder = new TextEncoderStream();
    encoder.readable.pipeTo(port.writable);
    writer = encoder.writable.getWriter();

    readSerial();

    alert("Arduino Connected Successfully");
  } catch (error) {
    alert("Connection Failed");
  }
}

async function readSerial() {
  const decoder = new TextDecoderStream();
  port.readable.pipeTo(decoder.writable);

  const reader = decoder.readable.getReader();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += value;
    let lines = buffer.split("\n");
    buffer = lines.pop();

    lines.forEach(line => {
      updateSystem(line.trim());
    });
  }
}

function updateSystem(msg) {
  console.log("Arduino:", msg);

  let status = document.getElementById("status");
  let alertBox = document.getElementById("alertBox");

  if (msg.includes("MULTIPLE_FAIL")) {
    lockActive = true;
    otpVerified = false;
    currentOTP = generateOTP();

    alertBox.innerText = "🚨 MULTIPLE FAILED ATTEMPTS";
    alertBox.className = "alertBox alert-hack";

    // Send OTP to email
    sendOTPEmail(currentOTP);

    // Show popup for user to enter OTP
    showOTPPopup();
    return;
  }

  // Normal events
  if (msg.includes("UNLOCK")) {
    status.innerText = "🔓 UNLOCKED";
    status.style.color = "lime";
    alertBox.innerText = "🟢 Door Opened Successfully";
    alertBox.className = "alertBox alert-success";
  } else if (msg.includes("LOCK")) {
    status.innerText = "🔒 LOCKED";
    status.style.color = "red";
    alertBox.innerText = "Door Locked";
    alertBox.className = "alertBox";
  } else if (msg.includes("ACCESS_DENIED")) {
    alertBox.innerText = "⛔ Unauthorized RFID Detected";
    alertBox.className = "alertBox alert-danger";
  } else if (msg.includes("WRONG_PASSWORD")) {
    alertBox.innerText = "⚠ Wrong Password Attempt";
    alertBox.className = "alertBox alert-warning";
  } else if (msg.includes("HACK_ATTEMPT")) {
    document.getElementById("hackPopup").style.display = "flex";
  }
}

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000);
}

// Show OTP popup
function showOTPPopup() {
  const popup = document.getElementById("otpPopup");
  popup.style.display = "flex";
}

// Verify OTP entered by user
function verifyOTP() {
  const input = document.getElementById("otpInput").value;
  const popup = document.getElementById("otpPopup");
  const alertBox = document.getElementById("alertBox");

  if (input == currentOTP) {
    alertBox.innerText = "✅ OTP Verified! You can try password again";
    alertBox.className = "alertBox alert-success";

    otpVerified = true;
    lockActive = false;
    currentOTP = null;

    if (writer) {
      writer.write("O"); // notify Arduino
    }

    popup.style.display = "none";
  } else {
    alertBox.innerText = "❌ Wrong OTP! Door still locked";
    alertBox.className = "alertBox alert-danger";
  }
}

// Close popups
function closeOTP() { document.getElementById("otpPopup").style.display = "none"; }
function closeHack() { document.getElementById("hackPopup").style.display = "none"; }

// Door control
function unlock() { if (!lockActive && writer) writer.write("U"); }
function lock() { if (writer) writer.write("L"); }

// ---------- EMAILJS FUNCTION ----------
function sendOTPEmail(otp) {
  emailjs.send("RUh_ykRc57jPMhYNK", "template_i6szekk", {
    to_email: userEmail,
    otp_code: otp
  })
  .then(function(response){
    console.log("OTP sent via email!", response.status, response.text);
  }, function(error){
    console.log("Failed to send OTP", error);
  });
}