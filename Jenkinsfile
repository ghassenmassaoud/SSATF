pipeline {
    agent any
    
    environment {
        DOCKER_REGISTRY = 'your-docker-registry.com'
        NEXUS_URL = 'http://your-nexus-server:8081'
        NEXUS_REPOSITORY = 'npm-hosted'
        SONAR_PROJECT_KEY = 'financial-transaction-system'
        DOCKER_CREDENTIALS_ID = 'docker-registry-credentials'
        NEXUS_CREDENTIALS_ID = 'nexus-credentials'
        SONAR_CREDENTIALS_ID = 'sonarqube-token'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Install Dependencies') {
            parallel {
                stage('Data Analyser Service') {
                    steps {
                        dir('Services/DataAnalyserService') {
                            sh 'npm ci'
                        }
                    }
                }
                stage('Transaction API') {
                    steps {
                        dir('Services/TransactionGenerationAPI') {
                            sh 'npm ci'
                        }
                    }
                }
                stage('Client UI') {
                    steps {
                        dir('Client_UI') {
                            sh 'npm ci'
                        }
                    }
                }
            }
        }
        
        stage('Test') {
            parallel {
                stage('Test Data Analyser') {
                    steps {
                        dir('Services/DataAnalyserService') {
                            sh 'npm test'
                        }
                    }
                    post {
                        always {
                            publishTestResults testResultsPattern: 'Services/DataAnalyserService/test-results.xml'
                        }
                    }
                }
                stage('Test Transaction API') {
                    steps {
                        dir('Services/TransactionGenerationAPI') {
                            sh 'npm test'
                        }
                    }
                    post {
                        always {
                            publishTestResults testResultsPattern: 'Services/TransactionGenerationAPI/test-results.xml'
                        }
                    }
                }
                stage('Test Client UI') {
                    steps {
                        dir('Client_UI') {
                            sh 'npm test'
                        }
                    }
                    post {
                        always {
                            publishTestResults testResultsPattern: 'Client_UI/test-results.xml'
                        }
                    }
                }
            }
        }
        
        stage('Code Quality & Security Scans') {
            parallel {
                stage('SonarQube Analysis') {
                    steps {
                        withSonarQubeEnv('SonarQube') {
                            sh '''
                                sonar-scanner \
                                -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                                -Dsonar.sources=. \
                                -Dsonar.exclusions=**/node_modules/**,**/coverage/** \
                                -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
                            '''
                        }
                    }
                }
                stage('Vulnerability Scan') {
                    steps {
                        script {
                            sh 'npm audit --audit-level=high --json > npm-audit.json || true'
                            sh 'npm audit --audit-level=high'
                        }
                    }
                    post {
                        always {
                            archiveArtifacts artifacts: 'npm-audit.json', allowEmptyArchive: true
                        }
                    }
                }
            }
        }
        
        stage('Quality Gate') {
            steps {
                timeout(time: 1, unit: 'HOURS') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }
        
        stage('Build & Package') {
            parallel {
                stage('Build Data Analyser') {
                    steps {
                        dir('Services/DataAnalyserService') {
                            sh 'npm run build || echo "No build script found"'
                            sh 'npm pack'
                        }
                    }
                }
                stage('Build Transaction API') {
                    steps {
                        dir('Services/TransactionGenerationAPI') {
                            sh 'npm run build || echo "No build script found"'
                            sh 'npm pack'
                        }
                    }
                }
                stage('Build Client UI') {
                    steps {
                        dir('Client_UI') {
                            sh 'npm run build || echo "No build script found"'
                            sh 'npm pack'
                        }
                    }
                }
            }
        }
        
        stage('Store Artifacts to Nexus') {
            steps {
                script {
                    def services = ['Services/DataAnalyserService', 'Services/TransactionGenerationAPI', 'Client_UI']
                    services.each { service ->
                        dir(service) {
                            sh '''
                                PACKAGE_NAME=$(npm pack --dry-run --json | jq -r '.[0].filename')
                                curl -u $NEXUS_CREDENTIALS_USR:$NEXUS_CREDENTIALS_PSW \
                                --upload-file $PACKAGE_NAME \
                                ${NEXUS_URL}/repository/${NEXUS_REPOSITORY}/
                            '''
                        }
                    }
                }
            }
        }
        
        stage('Build Docker Images') {
            parallel {
                stage('Build Data Analyser Image') {
                    steps {
                        script {
                            def image = docker.build("${DOCKER_REGISTRY}/data-analyser:${BUILD_NUMBER}", "./Services/DataAnalyserService")
                            docker.withRegistry("https://${DOCKER_REGISTRY}", DOCKER_CREDENTIALS_ID) {
                                image.push()
                                image.push("latest")
                            }
                        }
                    }
                }
                stage('Build Transaction API Image') {
                    steps {
                        script {
                            def image = docker.build("${DOCKER_REGISTRY}/transaction-api:${BUILD_NUMBER}", "./Services/TransactionGenerationAPI")
                            docker.withRegistry("https://${DOCKER_REGISTRY}", DOCKER_CREDENTIALS_ID) {
                                image.push()
                                image.push("latest")
                            }
                        }
                    }
                }
                stage('Build Client UI Image') {
                    steps {
                        script {
                            def image = docker.build("${DOCKER_REGISTRY}/client-ui:${BUILD_NUMBER}", "./Client_UI")
                            docker.withRegistry("https://${DOCKER_REGISTRY}", DOCKER_CREDENTIALS_ID) {
                                image.push()
                                image.push("latest")
                            }
                        }
                    }
                }
            }
        }
        
        stage('Container Security Scan') {
            parallel {
                stage('Scan Data Analyser Image') {
                    steps {
                        script {
                            sh "docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest image ${DOCKER_REGISTRY}/data-analyser:${BUILD_NUMBER}"
                        }
                    }
                }
                stage('Scan Transaction API Image') {
                    steps {
                        script {
                            sh "docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest image ${DOCKER_REGISTRY}/transaction-api:${BUILD_NUMBER}"
                        }
                    }
                }
                stage('Scan Client UI Image') {
                    steps {
                        script {
                            sh "docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest image ${DOCKER_REGISTRY}/client-ui:${BUILD_NUMBER}"
                        }
                    }
                }
            }
        }
    }
    
    post {
        always {
            cleanWs()
        }
        success {
            echo 'Pipeline completed successfully!'
        }
        failure {
            echo 'Pipeline failed!'
        }
    }
}