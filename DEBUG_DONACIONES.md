# Debugging Guide for Donaciones Section

## Step 1: Check Browser DevTools

1. **Open DevTools** (F12 or Right-click → Inspect)
2. **Select the problematic `<p>` tag** in the Elements/Inspector tab
3. **Check the Computed Styles tab** and look for:
   - `text-align` - Should be `center`
   - `width` - Should be `100%` or a calculated pixel value
   - `max-width` - Should be `100%` or `800px` (desktop)
   - `overflow` - Should be `visible`
   - `direction` - Should be `ltr`

## Step 2: Check Parent Containers

Inspect these elements in order (from outer to inner):
1. `.donaciones-page` - Check for `overflow: hidden`, `width` constraints
2. `.cont` - Check padding matches Return component (40px/20px/15px)
3. `.donaciones-why` - Check `overflow`, `width`, `padding`
4. `<p>` tags - Check all computed styles

## Step 3: Check for Conflicting CSS

In DevTools Console, run:
```javascript
// Check if Tailwind is overriding
const p = document.querySelector('.donaciones-why p');
console.log('Computed text-align:', window.getComputedStyle(p).textAlign);
console.log('Computed width:', window.getComputedStyle(p).width);
console.log('Computed max-width:', window.getComputedStyle(p).maxWidth);
console.log('Computed direction:', window.getComputedStyle(p).direction);
```

## Step 4: Check for RTL/Language Issues

In DevTools Console:
```javascript
// Check document direction
console.log('Document direction:', document.documentElement.dir);
console.log('Body direction:', document.body.dir);
```

## Step 5: Test with Isolated Styles

Temporarily add this to test if it's a CSS specificity issue:
```css
.donaciones-why p {
  text-align: center !important;
  width: 100% !important;
  max-width: 100% !important;
  overflow: visible !important;
  direction: ltr !important;
}
```

## Common Issues to Check:

1. **Tailwind CSS** - May have utility classes overriding styles
2. **Parent overflow** - `.donaciones-page` or `.cont` might have `overflow: hidden`
3. **RTL language** - HTML lang attribute might be set to RTL language
4. **CSS specificity** - Another stylesheet might have higher specificity
5. **Box-sizing** - Missing `box-sizing: border-box` causing width issues

## Quick Fix Test:

Add this directly in DevTools Console to test:
```javascript
document.querySelectorAll('.donaciones-why p').forEach(p => {
  p.style.textAlign = 'center';
  p.style.width = '100%';
  p.style.maxWidth = '100%';
  p.style.overflow = 'visible';
  p.style.direction = 'ltr';
});
```

If this fixes it, the issue is CSS specificity or loading order.

