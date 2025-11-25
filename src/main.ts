import { createApp } from "vue";
import { createPinia } from "pinia";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import "./style.css";
import App from "./App.vue";
import { handleError } from "@/utils/errorHandler";
import { registerIcons } from "@/utils/icons";

const app = createApp(App);
const pinia = createPinia();

// Register Element Plus icons globally
registerIcons(app);

// Global error handler
// Requirement 2.13, 10.3: Handle errors gracefully with user-friendly messages
app.config.errorHandler = (err, _instance, info) => {
	console.error("Global error handler:", err, info);
	handleError(err, `Vue Error (${info})`);
};

// Handle unhandled promise rejections
window.addEventListener("unhandledrejection", (event) => {
	console.error("Unhandled promise rejection:", event.reason);
	handleError(event.reason, "Unhandled Promise");
	event.preventDefault();
});

// Handle global errors
window.addEventListener("error", (event) => {
	console.error("Global error:", event.error);
	handleError(event.error, "Global Error");
});

app.use(pinia);
app.use(ElementPlus);
app.mount("#app");
