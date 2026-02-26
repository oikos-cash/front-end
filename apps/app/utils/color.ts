export function getThemeColors() {
  const isDark = document.documentElement.classList.contains("dark");
  return {
    textColor: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
    borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
    success: "#22c55e",
    destructive: "#ef4444",
    chart1: "#3b82f6",
  };
}
