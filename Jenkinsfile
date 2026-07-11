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
                // sh 'kubectl apply -f k8s/' (Lo crearemos en el siguiente paso)
            }
        }

        stage('DAST (OWASP ZAP)') {
            steps {
                echo 'Ejecutando pruebas dinámicas de seguridad...'
                // Lanzaremos la imagen Docker de ZAP contra la aplicación viva
            }
        }
    }
}
