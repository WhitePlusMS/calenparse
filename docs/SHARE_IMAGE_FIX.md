# 分享图片完整内容修复

## 问题描述

之前的实现中，生成的分享图片只包含可见部分的内容，长文本（如描述、原始通告）会被截断，导致图片不完整。

## 问题原因

1. **预览区域限制**：`.share-dialog__image-preview` 有 `max-height: 500px` 和 `overflow-y: auto`
2. **内容区域限制**：`.share-preview__section-text` 有 `max-height: 150px` 和 `overflow-y: auto`
3. **html2canvas 行为**：只能截取可见的 DOM 内容，滚动区域外的内容不会被捕获

## 解决方案

### 1. 动态模式切换

添加 `isGeneratingImage` 标志来控制显示模式：

```typescript
// Flag to control full content display for image generation
const isGeneratingImage = ref(false);
```

### 2. 生成图片时的处理流程

```typescript
const handleDownloadImage = async () => {
    try {
        // 1. 启用完整内容显示模式
        isGeneratingImage.value = true;
        
        // 2. 等待 DOM 更新
        await new Promise((resolve) => setTimeout(resolve, 100));
        
        // 3. 生成包含完整内容的图片
        const blob = await generateShareImage(previewRef.value);
        
        // 4. 下载图片
        downloadBlob(blob, filename);
    } finally {
        // 5. 恢复预览模式
        isGeneratingImage.value = false;
    }
};
```

### 3. 动态类绑定

在模板中根据状态添加类：

```vue
<div
    ref="previewRef"
    :class="[
        'share-dialog__image-preview',
        { 'share-dialog__image-preview--full': isGeneratingImage },
    ]">
```

### 4. CSS 样式控制

添加完整内容模式的样式：

```css
/* Full content mode for image generation */
.share-dialog__image-preview--full {
    max-height: none !important;
    overflow: visible !important;
}

.share-dialog__image-preview--full .share-preview__section-text {
    max-height: none !important;
    overflow: visible !important;
}
```

## 工作原理

### 预览模式（默认）
- `isGeneratingImage = false`
- 保持滚动条和高度限制
- 用户可以在对话框中预览内容
- 长内容可以滚动查看

### 生成模式（临时）
- `isGeneratingImage = true`
- 移除所有高度限制
- 所有内容完全展开
- html2canvas 捕获完整内容
- 生成后立即恢复预览模式

## 优势

1. **完整内容**：生成的图片包含所有信息，不会截断
2. **用户体验**：预览时仍然保持滚动，不会占用过多屏幕空间
3. **性能优化**：只在生成图片时临时展开内容
4. **无闪烁**：使用 loading 遮罩，用户看不到内容展开的过程

## 测试验证

### 测试场景

1. **短内容事件**
   - ✅ 预览正常显示
   - ✅ 图片包含完整内容

2. **长描述事件**
   - ✅ 预览时可滚动
   - ✅ 图片包含完整描述

3. **长原始文本**
   - ✅ 预览时可滚动
   - ✅ 图片包含完整原始文本

4. **多个事件**
   - ✅ 预览时可滚动
   - ✅ 图片包含所有事件的完整信息

### 构建测试

```bash
npm run build
```
✅ 构建成功，无错误

## 技术细节

### 时序控制

```
用户点击"下载图片"
    ↓
显示 Loading
    ↓
isGeneratingImage = true
    ↓
等待 100ms（DOM 更新）
    ↓
html2canvas 捕获完整内容
    ↓
生成 Blob
    ↓
下载文件
    ↓
isGeneratingImage = false
    ↓
隐藏 Loading
```

### CSS 优先级

使用 `!important` 确保在生成模式下样式能够覆盖默认样式：

```css
.share-dialog__image-preview--full {
    max-height: none !important;  /* 覆盖 max-height: 500px */
    overflow: visible !important;  /* 覆盖 overflow-y: auto */
}
```

## 浏览器兼容性

- ✅ Chrome/Edge - 完全支持
- ✅ Firefox - 完全支持
- ✅ Safari - 完全支持
- ✅ 移动浏览器 - 完全支持

## 性能影响

- **内存使用**：临时增加（展开内容时）
- **生成时间**：略微增加（内容更多）
- **用户体验**：无影响（有 loading 提示）

## 未来改进

1. **渐进式加载**：对于超长内容，可以分页生成
2. **压缩选项**：提供图片质量选择
3. **格式选项**：支持 JPEG、WebP 等格式
4. **尺寸控制**：允许用户选择图片尺寸

## 总结

通过动态切换显示模式，成功解决了图片内容截断的问题。现在生成的分享图片包含完整的事件信息，同时保持了良好的预览体验。
