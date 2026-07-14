pipeline {
    agent any

    // Disparador como codigo: sondea GitHub cada minuto en busca de nuevos commits
    triggers {
        pollSCM('* * * * *')
    }

    environment {
        // ID de las credenciales que configuraste en Jenkins
        DOCKER_CREDENTIALS_ID = 'docker-hub-credentials'
        DOCKER_IMAGE = 'dairymateo/sgac-web-test'
        DOCKER_TAG = "v${env.BUILD_ID}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo 'Repositorio clonado.'
            }
        }

        stage('Build & Test') {
            steps {
                echo 'Instalando dependencias de Node.js...'
                sh 'npm ci'
                echo 'Construyendo el proyecto...'
                sh 'npm run build'
                echo 'Ejecutando pruebas (Vitest) con cobertura...'
                // Genera coverage/lcov.info, que SonarQube usa para medir cobertura
                sh 'npm run coverage'
            }
            post {
                always {
                    archiveArtifacts artifacts: 'coverage/lcov.info', allowEmptyArchive: true
                }
            }
        }

        stage('SAST (SonarQube)') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    // Ejecuta el escáner (lo instalaremos vía CLI en Jenkins)
                    sh 'sonar-scanner'
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 10, unit: 'MINUTES') {
                    // Espera el resultado del análisis de SonarQube
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Build & Push Artifact (Docker)') {
            steps {
                script {
                    echo 'Construyendo imagen de Docker...'
                    docker.withRegistry('https://index.docker.io/v1/', "${DOCKER_CREDENTIALS_ID}") {
                        def appImage = docker.build("${DOCKER_IMAGE}:${DOCKER_TAG}")
                        appImage.push()
                        appImage.push('latest')
                    }
                }
            }
        }

        stage('Artifact Integrity (Trivy)') {
            steps {
                echo 'Validando integridad del artefacto: escaneo de vulnerabilidades en la imagen Docker...'
                // Trivy descarga la imagen desde Docker Hub y busca CVEs en el SO base y dependencias.
                // --exit-code 0: el escaneo es informativo; el reporte queda archivado como evidencia.
                sh "docker run --rm aquasec/trivy:latest image --severity HIGH,CRITICAL --exit-code 0 --timeout 10m ${DOCKER_IMAGE}:${DOCKER_TAG} | tee trivy-report.txt"
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-report.txt', allowEmptyArchive: true
                }
            }
        }

        stage('Deploy (Kubernetes/Minikube)') {
            steps {
                echo 'Desplegando la imagen en Kubernetes...'
                // Usamos stdin y apuntamos explícitamente a 127.0.0.1 para evitar errores de DNS en Minikube
                sh 'cat k8s/deployment.yaml | docker exec -i minikube kubectl --kubeconfig /etc/kubernetes/admin.conf --server=https://127.0.0.1:8443 --insecure-skip-tls-verify apply -f -'
                sh 'cat k8s/service.yaml | docker exec -i minikube kubectl --kubeconfig /etc/kubernetes/admin.conf --server=https://127.0.0.1:8443 --insecure-skip-tls-verify apply -f -'
            }
        }

        stage('DAST (OWASP ZAP)') {
            steps {
                echo 'Ejecutando pruebas dinámicas de seguridad (DAST)...'
                script {
                    // Obtenemos la IP del contenedor de minikube para poder atacarlo con ZAP
                    def MINIKUBE_IP = sh(script: "docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' minikube", returnStdout: true).trim()
                    
                    // Ejecutamos ZAP (con bandera -I para que no falle el pipeline si encuentra alertas de bajo nivel)
                    // La salida se guarda como evidencia del escaneo dinámico
                    sh "docker run --rm --network minikube -t zaproxy/zap-stable zap-baseline.py -t http://${MINIKUBE_IP}:30080 -I | tee zap-report.txt"
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'zap-report.txt', allowEmptyArchive: true
                }
            }
        }
    }

    // Post-acciones: se ejecutan al terminar el pipeline, segun su resultado
    post {
        always {
            echo 'Limpieza del entorno de trabajo...'
            sh 'rm -rf node_modules dist coverage || true'
        }
        success {
            echo 'El pipeline se completo exitosamente.'
        }
        failure {
            echo 'El pipeline fallo, revisa los errores en la consola.'
        }
    }
}
