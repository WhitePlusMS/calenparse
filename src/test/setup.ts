// Test setup file for Vitest
import { beforeEach } from "vitest";

// Reset DOM before each test
beforeEach(() => {
	// Clear document classes
	document.documentElement.className = "";

	// Clear inline styles
	document.documentElement.removeAttribute("style");

	// Clear localStorage
	localStorage.clear();
});
