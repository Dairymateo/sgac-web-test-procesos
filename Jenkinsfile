pipeline {
    agent any

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
                    sh "docker run --rm -t owasp/zap2docker-stable zap-baseline.py -t http://${MINIKUBE_IP}:30080 -I"
                }
            }
        }
    }
}
