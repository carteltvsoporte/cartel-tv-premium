# CTVP - Cartel TV Platform

<div align="center">

![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![Platform](https://img.shields.io/badge/platform-Web-brightgreen?style=for-the-badge)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

**Plataforma multimedia para seguir las últimas noticias de series de TV, anime y entretenimiento**

</div>

## 📋 Descripción

CARTEL TV es una plataforma web educativa que integra múltiples fuentes de información multimedia en un solo lugar. Permite a los usuarios explorar series de televisión, anime y noticias de entretenimiento con una interfaz moderna y responsiva.

### ✨ Características Principales

- **Sistema de autenticación** con múltiples usuarios y roles
- **Integración con TVMaze API** para series de televisión
- **Integración con Jikan API** (MyAnimeList) para anime
- **Sistema de búsqueda global** con resultados en tiempo real
- **Filtrado por categorías** dinámico y personalizable
- **Caché inteligente** para optimizar rendimiento
- **Diseño responsive** adaptable a todos los dispositivos
- **Accesibilidad mejorada** con soporte ARIA y navegación por teclado
- **Modo oscuro** por defecto con soporte para preferencias del sistema

## 🚀 Instalación y Uso

### Requisitos Previos

- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- Servidor web local (opcional, puede abrirse directamente)

### Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/carteltvsoporte/ctvp.git
cd ctvp
```

2. Abre el archivo `index.html` en tu navegador:
```bash
# Opción 1: Abrir directamente
open index.html

# Opción 2: Usar servidor local
python3 -m http.server 8000
# Luego visita http://localhost:8000
```

### Credenciales de Acceso

El sistema incluye varios usuarios de prueba:

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| admin | admin123 | Administrador |
| usuario | usuario123 | Usuario Regular |
| invitado | invitado123 | Invitado |
| juan | juan123 | Usuario |
| maria | maria123 | Usuario |

> ⚠️ **Nota de Seguridad**: Este es un proyecto educativo. Las contraseñas están en texto plano solo para demostración. NO usar en producción.

## 🏗️ Estructura del Proyecto

```
ctvp/
├── index.html              # Página principal
├── styles.css              # Estilos globales
├── script.js               # Lógica principal de la aplicación
├── ticket-login.js         # Sistema de autenticación
├── api-tvmaze.js          # Integración con TVMaze API
├── api-jikan.js           # Integración con Jikan API
├── README.md              # Este archivo
└── ANALISIS_MEJORAS.md    # Análisis de mejoras implementadas
```

## 🔧 Tecnologías Utilizadas

### Frontend
- **HTML5** - Estructura semántica
- **CSS3** - Estilos y animaciones
- **JavaScript (ES6+)** - Lógica de la aplicación

### APIs Externas
- **[TVMaze API](https://www.tvmaze.com/api)** - Información de series de TV
- **[Jikan API](https://jikan.moe/)** - Datos de anime de MyAnimeList

### Librerías
- **[Font Awesome 6.4.0](https://fontawesome.com/)** - Iconografía
- **[Google Fonts](https://fonts.google.com/)** - Tipografías (Montserrat, Open Sans)

## 📱 Características Técnicas

### Rendimiento
- Caché de datos con localStorage (1 hora de validez)
- Lazy loading de imágenes
- Debouncing en búsqueda (300ms)
- Optimización de consultas a APIs

### Accesibilidad
- Soporte completo de navegación por teclado
- Atributos ARIA para lectores de pantalla
- Contraste de colores WCAG AA
- Focus visible en elementos interactivos

### Seguridad
- Validación de entrada de usuario
- Protección contra intentos de login múltiples
- Bloqueo temporal después de 5 intentos fallidos
- Sesiones con expiración de 24 horas

## 🎨 Capturas de Pantalla

### Pantalla de Login
Sistema de autenticación con validación de credenciales y protección contra fuerza bruta.

### Dashboard Principal
Vista general con estadísticas y acceso rápido a todas las secciones.

### Sección de Series TV
Exploración de series con filtros por categoría y búsqueda.

### Sección de Anime
Catálogo de anime con información detallada de MyAnimeList.

## 🔄 Actualizaciones Recientes

### Versión 3.0 (Diciembre 2024)
- ✅ Corregidas variables globales sin declaración
- ✅ Reemplazado `substr()` deprecado por `substring()`
- ✅ Implementada función de búsqueda completa
- ✅ Mejorado manejo de errores en APIs
- ✅ Agregada documentación JSDoc
- ✅ Optimizado rendimiento de caché
- ✅ Mejorada accesibilidad con ARIA
- ✅ Actualizado README con información completa

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🙏 Créditos

### APIs y Servicios
- **TVMaze** - Por proporcionar datos de series de TV
- **Jikan/MyAnimeList** - Por proporcionar datos de anime
- **Font Awesome** - Por los iconos
- **Google Fonts** - Por las tipografías

### Desarrolladores
- **Cartel TV Soporte** - Desarrollo y mantenimiento

## 📞 Contacto

Para preguntas, sugerencias o reportar problemas:

- **GitHub Issues**: [github.com/carteltvsoporte/ctvp/issues](https://github.com/carteltvsoporte/ctvp/issues)
- **Email**: contacto@carteltv.demo

## ⚠️ Disclaimer

Este es un proyecto educativo con fines demostrativos. No está destinado para uso en producción sin las debidas medidas de seguridad implementadas. Todo el contenido multimedia es obtenido de APIs públicas y pertenece a sus respectivos propietarios.

---

<div align="center">

**Hecho con ❤️ por el equipo de Cartel TV**

⭐ Si te gusta este proyecto, dale una estrella en GitHub ⭐

</div>
