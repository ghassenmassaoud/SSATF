pipeline {
    agent any
    
    environment {
        DOCKER_REGISTRY = 'ghassenmassaoud'
        NEXUS_URL = 'http://nexus-job.duckdns.org:31476/'
        NEXUS_REPOSITORY = 'npm-hosted'
        SONAR_PROJECT_KEY = 'financial-transaction-system'
    }
    
    stages {
        stage('Checkout') {
            steps {
                git branch: 'devops', credentialsId: 'GIT_CREDENTIAL', url: 'https://github.com/ghassenmassaoud/SSATF.git'
            }
        }
        
        stage('Install Dependencies') {
            parallel {
                stage('Data Analyser Service') {
                    steps {
                        dir('Services/DataAnalyserService') {
                            sh 'npm install'
                        }
                    }
                }
                stage('Transaction API') {
                    steps {
                        dir('Services/TransactionGenerationAPI') {
                            sh 'npm install'
                        }
                    }
                }
                stage('Client UI') {
                    steps {
                        dir('Client_UI') {
                            sh 'npm install'
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
                            sh 'npm test || true'
                            junit 'test-results.xml'                        
                            
                        }
                    }
                }
                stage('Test Transaction API') {
                    steps {
                        dir('Services/TransactionGenerationAPI') {
                            sh 'npm test || true'
                            junit 'test-results.xml'           
                        }
                    }
                }
                stage('Test Client UI') {
                    steps {
                        dir('Client_UI') {
                            sh 'npm test || true'
                            junit 'test-results.xml' 
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
            
            withCredentials([usernamePassword(credentialsId: 'NEXUS_CREDENTIAL', usernameVariable: 'NEXUS_USER', passwordVariable: 'NEXUS_PASS')]) {
                services.each { service ->
                    dir(service) {
                        sh """
                            PACKAGE_NAME=\$(npm pack --dry-run --json | jq -r '.[0].filename')
                            npm pack
                            curl -u \$NEXUS_USER:\$NEXUS_PASS \\
                            --upload-file \$PACKAGE_NAME \\
                            ${NEXUS_URL}/repository/${NEXUS_REPOSITORY}/
                        """
                    }
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
                            // Scan before pushing
                            sh "trivy image --exit-code 1 --severity HIGH,CRITICAL ${imageName}"
                            docker.withRegistry("https://index.docker.io/v1/", DOCKER_CREDENTIAL) {
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
                            // Scan before pushing
                            sh "trivy image --exit-code 1 --severity HIGH,CRITICAL ${imageName}"
                            docker.withRegistry("https://index.docker.io/v1/", DOCKER_CREDENTIAL) {
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
                            // Scan before pushing
                            sh "trivy image --exit-code 1 --severity HIGH,CRITICAL ${imageName}"
                            docker.withRegistry("https://index.docker.io/v1/", DOCKER_CREDENTIAL) {
                                image.push()
                                image.push("latest")
                            }
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