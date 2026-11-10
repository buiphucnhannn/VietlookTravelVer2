// Icon thương hiệu (lucide v1 không còn kèm logo mạng xã hội).
const base = (props) => ({
  viewBox: "0 0 24 24",
  width: 24,
  height: 24,
  "aria-hidden": true,
  ...props,
});

export function WhatsAppIcon(props) {
  return (
    <svg {...base(props)} fill="currentColor">
      <path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.98L2 22l5.17-1.5A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.07.89.9-2.98-.2-.31a8.2 8.2 0 1 1 6.87 3.73Zm4.5-6.14c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.55.12-.17.25-.64.8-.78.97-.14.16-.29.18-.53.06a6.7 6.7 0 0 1-3.34-2.92c-.25-.43.25-.4.72-1.34.08-.16.04-.3-.02-.42-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.41-.55-.42h-.47a.9.9 0 0 0-.65.3 2.74 2.74 0 0 0-.86 2.04 4.77 4.77 0 0 0 1 2.53 10.9 10.9 0 0 0 4.18 3.7c1.55.67 2.16.73 2.94.61.47-.07 1.46-.6 1.66-1.17.2-.58.2-1.07.15-1.17-.06-.1-.22-.17-.46-.29Z" />
    </svg>
  );
}

export function WeChatIcon(props) {
  return (
    <svg {...base(props)} fill="currentColor">
      <path d="M9.1 3.5C4.9 3.5 1.5 6.3 1.5 9.8c0 2 1.1 3.8 2.9 5l-.7 2.2 2.6-1.4c.9.3 1.8.4 2.8.4h.6a5.6 5.6 0 0 1-.2-1.5c0-3.4 3.2-6.1 7.2-6.1h.6C16.6 5.6 13.2 3.5 9.1 3.5Zm-2.6 4.6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm5.2 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm10.8 6.4c0-2.9-2.9-5.3-6.4-5.3s-6.4 2.4-6.4 5.3 2.9 5.3 6.4 5.3c.7 0 1.5-.1 2.2-.3l2.1 1.2-.6-1.9c1.6-1 2.7-2.6 2.7-4.3Zm-8.5-.9a.85.85 0 1 1 0-1.7.85.85 0 0 1 0 1.7Zm4.2 0a.85.85 0 1 1 0-1.7.85.85 0 0 1 0 1.7Z" />
    </svg>
  );
}

export function ZaloIcon(props) {
  return (
    <svg {...base(props)} fill="none">
      <rect x="1.5" y="1.5" width="21" height="21" rx="6" fill="#0068ff" />
      <text
        x="12"
        y="15.2"
        textAnchor="middle"
        fontSize="7.4"
        fontWeight="700"
        fontFamily="Arial, sans-serif"
        fill="#fff"
      >
        Zalo
      </text>
    </svg>
  );
}

export function FacebookIcon(props) {
  return (
    <svg {...base(props)} fill="currentColor">
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />
    </svg>
  );
}

export function YouTubeIcon(props) {
  return (
    <svg {...base(props)} fill="currentColor">
      <path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8ZM9.8 15.1V8.9l5.8 3.1-5.8 3.1Z" />
    </svg>
  );
}

export function InstagramIcon(props) {
  return (
    <svg {...base(props)} fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TripAdvisorIcon(props) {
  return (
    <svg {...base(props)} fill="currentColor">
      <path d="M12 6.4c-2.2 0-4.3.6-6 1.7H1.9l1.5 1.7A5 5 0 0 0 7.4 18a5 5 0 0 0 3.4-1.4l1.2 1.4 1.2-1.4A5 5 0 0 0 16.6 18a5 5 0 0 0 4-8.2l1.5-1.7H18a11 11 0 0 0-6-1.7Zm-4.6 3.2a3.4 3.4 0 1 1 0 6.8 3.4 3.4 0 0 1 0-6.8Zm9.2 0a3.4 3.4 0 1 1 0 6.8 3.4 3.4 0 0 1 0-6.8Zm-9.2 1.6a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6Zm9.2 0a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6ZM12 8c1.3 0 2.6.3 3.7.8A5 5 0 0 0 12 13a5 5 0 0 0-3.7-4.2c1.1-.5 2.4-.8 3.7-.8Z" />
    </svg>
  );
}

export function GoogleIcon(props) {
  return (
    <svg {...base(props)}>
      <path
        fill="#4285F4"
        d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8Z"
      />
      <path
        fill="#34A853"
        d="M12 23c3 0 5.5-1 7.2-2.7l-3.5-2.7c-1 .7-2.2 1-3.7 1-2.9 0-5.3-1.9-6.2-4.5H2.2v2.8A11 11 0 0 0 12 23Z"
      />
      <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.2a11 11 0 0 0 0 9.8l3.6-2.8Z" />
      <path
        fill="#EA4335"
        d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.1-3.1A11 11 0 0 0 2.2 7.1l3.6 2.8C6.7 7.3 9.1 5.4 12 5.4Z"
      />
    </svg>
  );
}

/* ---- Logo thẻ thanh toán (chân trang – mục 26). Vẽ đơn giản bằng SVG, nền trắng bo góc. ---- */
const card = (props) => ({
  viewBox: "0 0 48 32",
  width: 48,
  height: 32,
  "aria-hidden": true,
  ...props,
});

export function VisaCardIcon(props) {
  return (
    <svg {...card(props)}>
      <rect width="48" height="32" rx="4" fill="#fff" />
      <text
        x="24"
        y="21"
        textAnchor="middle"
        fontSize="13"
        fontWeight="800"
        fontStyle="italic"
        fontFamily="Arial, sans-serif"
        fill="#1a1f71"
      >
        VISA
      </text>
    </svg>
  );
}

export function MastercardIcon(props) {
  return (
    <svg {...card(props)}>
      <rect width="48" height="32" rx="4" fill="#fff" />
      <circle cx="19" cy="16" r="9" fill="#eb001b" />
      <circle cx="29" cy="16" r="9" fill="#f79e1b" fillOpacity="0.9" />
    </svg>
  );
}

export function JcbIcon(props) {
  return (
    <svg {...card(props)}>
      <rect width="48" height="32" rx="4" fill="#fff" />
      <rect x="9" y="6" width="9" height="20" rx="3" fill="#0e4c96" />
      <rect x="19.5" y="6" width="9" height="20" rx="3" fill="#d61f26" />
      <rect x="30" y="6" width="9" height="20" rx="3" fill="#00a650" />
      <text
        x="13.5"
        y="19.5"
        textAnchor="middle"
        fontSize="8"
        fontWeight="800"
        fontFamily="Arial, sans-serif"
        fill="#fff"
      >
        J
      </text>
      <text
        x="24"
        y="19.5"
        textAnchor="middle"
        fontSize="8"
        fontWeight="800"
        fontFamily="Arial, sans-serif"
        fill="#fff"
      >
        C
      </text>
      <text
        x="34.5"
        y="19.5"
        textAnchor="middle"
        fontSize="8"
        fontWeight="800"
        fontFamily="Arial, sans-serif"
        fill="#fff"
      >
        B
      </text>
    </svg>
  );
}
