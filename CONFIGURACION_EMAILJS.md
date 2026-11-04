# 📧 Guía Paso a Paso: Configuración de EmailJS

Esta guía te ayudará a configurar EmailJS para que el formulario de contacto envíe emails automáticamente.

---

## ⚙️ PASO 1: Crear cuenta en EmailJS

1. **Ve a:** https://www.emailjs.com/
2. **Haz clic en:** "Sign Up" (o "Login" si ya tienes cuenta)
3. **Puedes registrarte con:**
   - Email y contraseña
   - O más rápido: **"Sign in with Google"** (recomendado)

> ✅ **Nota:** El plan gratuito permite 200 emails por mes, suficiente para empezar.

---

## 📬 PASO 2: Crear Servicio de Email

1. **En el dashboard de EmailJS**, busca en el menú izquierdo **"Email Services"**
2. **Haz clic en:** "Add New Service"
3. **Selecciona:** "Gmail"
4. **Configuración:**
   - Conecta tu cuenta de Gmail (creciendofelizabc@gmail.com)
   - Sigue las instrucciones para autorizar el acceso
   - El servicio se conectará automáticamente

5. **IMPORTANTE:** Copia el **Service ID** que aparece (ejemplo: `service_abc123xyz`)
   - Lo verás en la lista de servicios o en los detalles del servicio

---

## 📝 PASO 3: Crear Template de Email

1. **En el dashboard**, ve a **"Email Templates"** (menú izquierdo)
2. **Haz clic en:** "Create New Template"
3. **Configura el template así:**

### **Asunto del Email (Subject):**
```
Nuevo mensaje de contacto - {{from_name}}
```

### **Contenido del Email (Content):**
```
Has recibido un nuevo mensaje del formulario de contacto de la Fundación Creciendo Feliz.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Nombre: {{from_name}}
Email: {{from_email}}
Teléfono: {{phone}}

Mensaje:
{{message}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Este mensaje fue enviado desde el sitio web.
Por favor responde directamente a: {{from_email}}
```

### **Configuración del Template:**
- **To Email:** `creciendofelizabc@gmail.com`
- **From Name:** `Sitio Web Fundación`
- **Reply To:** `{{from_email}}` (para que puedas responder directamente)

4. **Guarda el template** y copia el **Template ID** (ejemplo: `template_xyz789abc`)
   - Lo verás en la lista de templates o en los detalles del template

---

## 🔑 PASO 4: Obtener tu Public Key

1. **En el dashboard**, ve a **"Account"** (menú izquierdo)
2. **Luego:** "General"
3. **Busca:** "Public Key" (también llamada "API Key")
4. **Copia** tu Public Key (ejemplo: `abcdefghijklmnop123456`)

---

## 💻 PASO 5: Actualizar el Código

Las claves ya no van en el código: se leen de variables de entorno.

1. **Copia** `.env.example` a `.env.local` (este archivo no se sube a Git)
2. **Llena** los valores con los que copiaste:

```bash
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=abcdefghijklmnop123456  # ← Tu Public Key
NEXT_PUBLIC_EMAILJS_SERVICE_ID=service_abc123xyz       # ← Tu Service ID
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=template_xyz789abc     # ← Tu Template ID
```

3. **En producción**, crea las mismas tres variables en Vercel (Settings → Environment Variables) para Production y Preview, y vuelve a desplegar: los valores se incluyen al momento del build.

---

## ✅ PASO 6: Probar el Formulario

1. **Inicia el servidor** (si no está corriendo):
   ```bash
   npm run dev
   ```

2. **Ve a la página de contacto** en tu navegador
3. **Llena el formulario** con tus datos de prueba
4. **Haz clic en "Enviar"**
5. **Revisa tu email:** `creciendofelizabc@gmail.com`
   - Deberías recibir el email con la información del formulario

---

## 🔍 Solución de Problemas

### ❌ "Error al enviar" en SweetAlert
- Verifica que copiaste correctamente los IDs y la Public Key
- Asegúrate de que no hay espacios extras
- Verifica que el servicio de Gmail está conectado correctamente

### ❌ No recibes emails
- Revisa la carpeta de spam en Gmail
- Verifica que el "To Email" en el template es correcto
- Revisa la consola del navegador (F12) para ver errores

### ❌ El template no funciona
- Asegúrate de usar exactamente estos nombres de variables:
  - `{{from_name}}`
  - `{{from_email}}`
  - `{{phone}}`
  - `{{message}}`

---

## 📞 ¿Necesitas más ayuda?

Si tienes problemas durante la configuración:
1. Revisa los logs de EmailJS en el dashboard
2. Verifica que todos los IDs están correctos
3. Prueba enviar un email de prueba desde el dashboard de EmailJS

---

## 📋 Checklist de Configuración

- [ ] Cuenta creada en EmailJS
- [ ] Servicio de Gmail conectado
- [ ] Service ID copiado y actualizado en el código
- [ ] Template creado con el formato correcto
- [ ] Template ID copiado y actualizado en el código
- [ ] Public Key copiada y actualizada en el código
- [ ] Formulario probado y funcionando
- [ ] Email recibido correctamente

¡Listo! Tu formulario debería estar funcionando. 🎉

