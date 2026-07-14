# SGAC Web — CI/CD con enfoque DevSecOps

Proyecto de la asignatura **Procesos de Software (ISWZ3205)** — Universidad de Las Américas.

Aplicación web (React + TypeScript + Vite) desplegada mediante un pipeline CI/CD
totalmente automatizado con Jenkins, aplicando la filosofía **Shift-Left**:
la seguridad se integra desde el inicio del ciclo de desarrollo.

**Autores:** Fernando Mateo Herrera Vedoya, Junior Espin, Diego Correa

## Arquitectura del pipeline

El pipeline se define como código en el [`Jenkinsfile`](Jenkinsfile) y se dispara
automáticamente ante cada commit (Poll SCM). Sus etapas son:

| # | Etapa | Herramienta | Propósito |
|---|-------|-------------|-----------|
| 1 | Checkout | Git / GitHub | Extracción del código fuente (única fuente de verdad) |
| 2 | Build & Test | Node.js / Vitest | `npm ci`, compilación y pruebas con cobertura (`coverage/lcov.info`) |
| 3 | SAST | SonarQube | Análisis estático de vulnerabilidades y deuda técnica |
| 4 | Quality Gate | SonarQube + Webhook | Bloquea el pipeline si el código no supera las reglas de calidad/seguridad |
| 5 | Build & Push Artifact | Docker / Docker Hub | Imagen inmutable etiquetada con `v$BUILD_ID` (trazabilidad) |
| 6 | Artifact Integrity | Trivy | Escaneo de CVEs (HIGH/CRITICAL) sobre la imagen publicada; reporte archivado como evidencia |
| 7 | Deploy | Kubernetes (Minikube) | Aplica `k8s/deployment.yaml` y `k8s/service.yaml` (NodePort 30080) |
| 8 | DAST | OWASP ZAP | Ataque de caja negra contra la aplicación viva en el clúster; reporte archivado como evidencia |

## Prácticas DevSecOps integradas

- **SAST:** SonarQube analiza el código fuente en tiempo de compilación (reglas OWASP Top 10).
- **DAST:** OWASP ZAP (`zap-baseline.py`) ataca la aplicación desplegada en la red de Minikube.
- **Integridad del artefacto:** Trivy valida que la imagen Docker publicada no contenga
  vulnerabilidades HIGH/CRITICAL en el SO base ni en las dependencias.
- **Quality Gate:** el pipeline aborta (fail-fast) si el análisis estático no es aprobado.
- **Evidencias:** los reportes de cobertura, Trivy y ZAP se archivan como artefactos de cada build en Jenkins.

## Ejecución local

```bash
npm ci            # instalar dependencias
npm run dev       # servidor de desarrollo
npm run build     # compilar para producción
npm run test      # pruebas (Vitest)
npm run coverage  # pruebas + reporte de cobertura
```

### Docker

```bash
docker build -t sgac-web-test .
docker run -p 8081:80 sgac-web-test
```

### Kubernetes (Minikube)

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
# la app queda expuesta en el NodePort 30080
```
