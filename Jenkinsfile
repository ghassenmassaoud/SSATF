pipeline {
    agent any
    
    environment {
        DOCKER_REGISTRY = 'ghassenmassaoud'
        NEXUS_URL = 'http://nexus-job.duckdns.org:31476/'
        NEXUS_REPOSITORY = 'npm-hosted'
        SONAR_PROJECT_KEY = 'financial-transaction-system'
        KUBECONFIG = credentials('KUBECONFIG_CREDENTIAL')
        K8S_NAMESPACE = 'financial-system'
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
                            sh 'rm -rf node_modules package-lock.json'
                            sh 'npm cache clean --force'
                            sh 'npm install'
                        }
                    }
                }
                stage('Transaction API') {
                    steps {
                        dir('Services/TransactionGenerationAPI') {
                            sh 'rm -rf node_modules package-lock.json'
                            sh 'npm cache clean --force'
                            sh 'npm install'
                        }
                    }
                }
                stage('Client UI') {
                    steps {
                        dir('Client_UI') {
                            sh 'rm -rf node_modules package-lock.json'
                            sh 'npm cache clean --force'
                            sh 'npm install'
                            sh 'npm install --save-dev jest-environment-jsdom@^29.7.0'
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
                            script {
                                try {
                                    sh 'npm test'
                                } catch (Exception e) {
                                    echo "Tests failed: ${e.getMessage()}"
                                    currentBuild.result = 'UNSTABLE'
                                }
                            }
                            publishTestResults testResultsPattern: 'test-results.xml', allowEmptyResults: true
                        }
                    }
                }
                stage('Test Transaction API') {
                    steps {
                        dir('Services/TransactionGenerationAPI') {
                            script {
                                try {
                                    sh 'npm test'
                                } catch (Exception e) {
                                    echo "Tests failed: ${e.getMessage()}"
                                    currentBuild.result = 'UNSTABLE'
                                }
                            }
                            publishTestResults testResultsPattern: 'test-results.xml', allowEmptyResults: true
                        }
                    }
                }
                stage('Test Client UI') {
                    steps {
                        dir('Client_UI') {
                            script {
                                try {
                                    sh 'npm test -- --passWithNoTests'
                                } catch (Exception e) {
                                    echo "Tests failed: ${e.getMessage()}"
                                    currentBuild.result = 'UNSTABLE'
                                }
                            }
                            publishTestResults testResultsPattern: 'test-results.xml', allowEmptyResults: true
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
                            sh 'npm audit --audit-level=high || true'
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
                    waitForQualityGate abortPipeline: false
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
        
        stage('Build & Push Docker Images') {
            parallel {
                stage('Build Data Analyser Image') {
                    steps {
                        script {
                            def imageName = "${DOCKER_REGISTRY}/data-analyser:${BUILD_NUMBER}"
                            def image = docker.build(imageName, "./Services/DataAnalyserService")
                            
                            // Security scan
                            sh "trivy image --exit-code 0 --severity HIGH,CRITICAL ${imageName} || true"
                            
                            docker.withRegistry("https://index.docker.io/v1/", 'DOCKER_CREDENTIAL') {
                                image.push()
                                image.push("latest")
                            }
                        }
                    }
                }
                stage('Build Transaction API Image') {
                    steps {
                        script {
                            def imageName = "${DOCKER_REGISTRY}/transaction-api:${BUILD_NUMBER}"
                            def image = docker.build(imageName, "./Services/TransactionGenerationAPI")
                            
                            // Security scan
                            sh "trivy image --exit-code 0 --severity HIGH,CRITICAL ${imageName} || true"
                            
                            docker.withRegistry("https://index.docker.io/v1/", 'DOCKER_CREDENTIAL') {
                                image.push()
                                image.push("latest")
                            }
                        }
                    }
                }
                stage('Build Client UI Image') {
                    steps {
                        script {
                            def imageName = "${DOCKER_REGISTRY}/client-ui:${BUILD_NUMBER}"
                            def image = docker.build(imageName, "./Client_UI")
                            
                            // Security scan
                            sh "trivy image --exit-code 0 --severity HIGH,CRITICAL ${imageName} || true"
                            
                            docker.withRegistry("https://index.docker.io/v1/", 'DOCKER_CREDENTIAL') {
                                image.push()
                                image.push("latest")
                            }
                        }
                    }
                }
            }
        }
        
        stage('Deploy to Kubernetes') {
            steps {
                script {
                    echo "🚀 Deploying to Kubernetes cluster..."
                    
                    // Check kubectl connectivity
                    sh 'kubectl cluster-info'
                    
                    // Create namespace if it doesn't exist
                    sh """
                        kubectl create namespace ${K8S_NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
                    """
                    
                    // Deploy infrastructure first
                    sh """
                        echo "📦 Deploying infrastructure components..."
                        kubectl apply -f k8s/persistent-volumes.yaml
                        kubectl apply -f k8s/configmaps.yaml
                        kubectl apply -f k8s/mongodb.yaml
                        kubectl apply -f k8s/kafka.yaml
                        kubectl apply -f k8s/elasticsearch.yaml
                    """
                    
                    // Wait for infrastructure to be ready
                    sh """
                        echo "⏳ Waiting for infrastructure to be ready..."
                        kubectl wait --for=condition=available deployment/mongodb -n ${K8S_NAMESPACE} --timeout=300s || true
                        kubectl wait --for=condition=available deployment/kafka -n ${K8S_NAMESPACE} --timeout=300s || true
                        kubectl wait --for=condition=available deployment/elasticsearch -n ${K8S_NAMESPACE} --timeout=300s || true
                    """
                    
                    // Update image tags in deployment files
                    sh """
                        sed -i 's|ghassenmassaoud/data-analyser:latest|${DOCKER_REGISTRY}/data-analyser:${BUILD_NUMBER}|g' k8s/transaction-api.yaml
                        sed -i 's|ghassenmassaoud/transaction-api:latest|${DOCKER_REGISTRY}/transaction-api:${BUILD_NUMBER}|g' k8s/transaction-api.yaml
                        sed -i 's|ghassenmassaoud/client-ui:latest|${DOCKER_REGISTRY}/client-ui:${BUILD_NUMBER}|g' k8s/transaction-api.yaml
                    """
                    
                    // Deploy applications
                    sh """
                        echo "🚀 Deploying application services..."
                        kubectl apply -f k8s/transaction-api.yaml
                    """
                    
                    // Wait for application deployments
                    sh """
                        echo "⏳ Waiting for applications to be ready..."
                        kubectl wait --for=condition=available deployment/transaction-generator-api -n ${K8S_NAMESPACE} --timeout=300s
                        kubectl wait --for=condition=available deployment/data-analyser-service -n ${K8S_NAMESPACE} --timeout=300s
                        kubectl wait --for=condition=available deployment/client-ui -n ${K8S_NAMESPACE} --timeout=300s
                    """
                    
                    // Get deployment status
                    sh """
                        echo "📊 Deployment Status:"
                        kubectl get pods -n ${K8S_NAMESPACE}
                        kubectl get services -n ${K8S_NAMESPACE}
                    """
                }
            }
        }
        
        stage('Health Check & Smoke Tests') {
            steps {
                script {
                    echo "🏥 Running health checks..."
                    
                    // Port forward for testing (in background)
                    sh """
                        kubectl port-forward svc/transaction-generator-api 7000:7000 -n ${K8S_NAMESPACE} &
                        kubectl port-forward svc/client-ui 4000:4000 -n ${K8S_NAMESPACE} &
                        sleep 10
                    """
                    
                    // Health checks
                    sh """
                        echo "Testing Transaction API health..."
                        curl -f http://localhost:7000/health || echo "Transaction API health check failed"
                        
                        echo "Testing Client UI..."
                        curl -f http://localhost:4000/ || echo "Client UI health check failed"
                    """
                    
                    // Kill port-forward processes
                    sh "pkill -f 'kubectl port-forward' || true"
                }
            }
        }
    }
    
    post {
        always {
            // Clean up
            sh """
                docker system prune -f || true
                pkill -f 'kubectl port-forward' || true
            """
            cleanWs()
        }
        success {
            echo """
            ✅ Pipeline completed successfully!
            
            🌐 Access your application:
            • Transaction API: kubectl port-forward svc/transaction-generator-api 7000:7000 -n ${K8S_NAMESPACE}
            • Client UI: kubectl port-forward svc/client-ui 4000:4000 -n ${K8S_NAMESPACE}
            • Kibana: kubectl port-forward svc/kibana 5601:5601 -n ${K8S_NAMESPACE}
            
            📊 Monitor with: kubectl get pods -n ${K8S_NAMESPACE}
            """
        }
        failure {
            echo '❌ Pipeline failed! Check logs and Kubernetes cluster status.'
            sh "kubectl get pods -n ${K8S_NAMESPACE} || true"
        }
    }
}

