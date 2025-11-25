/**
 * Element Plus 图标注册模块
 * 集中管理应用中使用的所有图标
 */
import type { App } from "vue";
import {
	Search,
	Close,
	Calendar,
	Location,
	Discount,
	Refresh,
	List,
	DataAnalysis,
	User,
	SetUp,
	Document,
	PriceTag,
	Share,
	Box,
	Moon,
	Sunny,
	Setting,
	UserFilled,
	Lock,
	TrendCharts,
	Filter,
	Timer,
	Edit,
	Delete,
	Select,
	InfoFilled,
	Warning,
	Clock,
} from "@element-plus/icons-vue";

/**
 * 应用中使用的所有图标
 * 按功能分组便于维护
 */
const icons = {
	// 通用操作
	Search,
	Close,
	Refresh,
	Filter,
	Edit,
	Delete,
	Select,

	// 视图相关
	Calendar,
	List,
	DataAnalysis,
	TrendCharts,
	Timer,
	Clock,

	// 工具相关
	SetUp,
	Document,
	PriceTag,
	Share,
	Box,

	// 主题相关
	Moon,
	Sunny,
	Setting,

	// 用户相关
	User,
	UserFilled,
	Lock,

	// 事件属性
	Location,
	Discount,

	// 提示相关
	InfoFilled,
	Warning,
};

/**
 * 注册所有图标到 Vue 应用实例
 * @param app - Vue 应用实例
 */
export function registerIcons(app: App): void {
	Object.entries(icons).forEach(([key, component]) => {
		app.component(key, component);
	});
}
