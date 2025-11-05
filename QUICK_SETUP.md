# ⚡ Configuración Rápida de EmailJS

## 📍 Dónde encontrar cada valor:

### 1️⃣ Service ID
**Ubicación:** Dashboard → Email Services → [Tu Servicio] → Ver detalles
- Aparece como: `service_xxxxxxxxx`
- **Ejemplo:** `service_gmail123`

### 2️⃣ Template ID  
**Ubicación:** Dashboard → Email Templates → [Tu Template] → Ver detalles
- Aparece como: `template_xxxxxxxxx`
- **Ejemplo:** `template_contacto456`

### 3️⃣ Public Key
**Ubicación:** Dashboard → Account → General → Public Key
- Aparece como: `xxxxxxxxxxxxxxxx`
- **Ejemplo:** `abc123xyz789`

---

## 🎯 Pasos Rápidos:

1. **Regístrate:** https://www.emailjs.com/ (gratis, 200 emails/mes)

2. **Crea Servicio:**
   - Email Services → Add New Service → Gmail
   - Conecta creciendofelizabc@gmail.com
   - **Copia el Service ID**

3. **Crea Template:**
   - Email Templates → Create New Template
   - Usa las variables: `{{from_name}}`, `{{from_email}}`, `{{phone}}`, `{{message}}`
   - To Email: `creciendofelizabc@gmail.com`
   - **Copia el Template ID**

4. **Obtén Public Key:**
   - Account → General → Public Key
   - **Copia la Public Key**

5. **Actualiza código:**
   - Abre `src/pages/Contactenos.js`
   - Líneas 99-101: Reemplaza `YOUR_SERVICE_ID`, `YOUR_TEMPLATE_ID`, `YOUR_PUBLIC_KEY`

---

## ✅ Ejemplo de cómo se ve:

```javascript
// ANTES:
const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';
const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY';

// DESPUÉS (con tus valores reales):
const EMAILJS_SERVICE_ID = 'service_gmail123';
const EMAILJS_TEMPLATE_ID = 'template_contacto456';
const EMAILJS_PUBLIC_KEY = 'abc123xyz789';
```

---

## 🧪 Probar:

1. Llena el formulario en tu sitio
2. Haz clic en "Enviar"
3. Revisa `creciendofelizabc@gmail.com`

---

**¿Problemas?** Lee `CONFIGURACION_EMAILJS.md` para la guía completa.

