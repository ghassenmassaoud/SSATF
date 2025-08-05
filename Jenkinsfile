pipeline {
  agent any

  environment {
    DOCKER_REGISTRY = 'ghassenmassaoud'
    NEXUS_URL = 'http://nexus-job.duckdns.org:31476'
    NEXUS_REPOSITORY = 'npm-hosted'
    SONAR_PROJECT_KEY = 'DataAnalysisApi'
    SONAR_PROJECT_KEY2 = 'TransactionGenAPI'
    SONAR_PROJECT_KEY3 = 'Client_UI'
    SONAR_HOME = tool "SonarScanner"
  }

  stages {
    stage("Clone Code") {
      steps {
        git branch: 'devops', credentialsId: 'GIT_CREDENTIAL', url: 'https://github.com/ghassenmassaoud/SSATF.git'
        echo "Code cloned successfully"
      }
    }

    stage("Run Tests") {
      parallel {
        stage("Test DataAnalyser") {
          steps {
            dir('Services/DataAnalyserService') {
              sh '''
                rm -rf node_modules package-lock.json
                npm cache clean --force
                npm install --save-dev jest-junit
                chmod +x ./node_modules/.bin/jest
                npx jest --ci --reporters=default --reporters=jest-junit
              '''
              junit 'junit.xml'
              archiveArtifacts artifacts: 'coverage/**', allowEmptyArchive: true
            }
          }
        }

        stage("Test Transaction API") {
          steps {
            dir('Services/TransactionGenerationAPI') {
              sh '''
                rm -rf node_modules package-lock.json
                npm cache clean --force
                npm install --save-dev jest-junit
                chmod +x ./node_modules/.bin/jest
                npx jest --ci --reporters=default --reporters=jest-junit
              '''
              junit 'junit.xml'
              archiveArtifacts artifacts: 'coverage/**', allowEmptyArchive: true
            }
          }
        }

        stage("Test Client UI") {
          steps {
            dir('Client_UI') {
              sh '''
                rm -rf node_modules package-lock.json
                npm cache clean --force
                npm install --save-dev jest-junit
                chmod +x ./node_modules/.bin/jest
                npx jest --ci --reporters=default --reporters=jest-junit
              '''
              junit 'junit.xml'
              archiveArtifacts artifacts: 'coverage/**', allowEmptyArchive: true
            }
          }
        }
      }
    }

    stage("Sonar Analysis") {
      parallel {
        stage("Sonar - DataAnalyser") {
          steps {
            dir('Services/DataAnalyserService') {
              withSonarQubeEnv("SonarQube") {
                sh '''
                  $SONAR_HOME/bin/sonar-scanner \
                    -Dsonar.projectKey=$SONAR_PROJECT_KEY \
                    -Dsonar.sources=. \
                    -Dsonar.tests=__tests__ \
                    -Dsonar.test.inclusions=__tests__/**/*.test.js \
                    -Dsonar.exclusions=node_modules/**,coverage/** \
                    -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info \
                    -Dsonar.junit.reportPaths=junit.xml \
                    -Dsonar.sourceEncoding=UTF-8
                '''
              }
            }
          }
        }

        stage("Sonar - Transaction API") {
          steps {
            dir('Services/TransactionGenerationAPI') {
              withSonarQubeEnv("SonarQube") {
                sh '''
                  $SONAR_HOME/bin/sonar-scanner \
                    -Dsonar.projectKey=$SONAR_PROJECT_KEY2 \
                    -Dsonar.sources=. \
                    -Dsonar.tests=__tests__ \
                    -Dsonar.test.inclusions=__tests__/**/*.test.js \
                    -Dsonar.exclusions=node_modules/**,uploads/**,coverage/** \
                    -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info \
                    -Dsonar.junit.reportPaths=junit.xml \
                    -Dsonar.sourceEncoding=UTF-8
                '''
              }
            }
          }
        }

        stage("Sonar - Client UI") {
          steps {
            dir('Client_UI') {
              withSonarQubeEnv("SonarQube") {
                sh '''
                  $SONAR_HOME/bin/sonar-scanner \
                    -Dsonar.projectKey=$SONAR_PROJECT_KEY3 \
                    -Dsonar.sources=. \
                    -Dsonar.tests=__tests__ \
                    -Dsonar.test.inclusions=__tests__/**/*.test.js \
                    -Dsonar.exclusions=node_modules/**,uploads/**,coverage/** \
                    -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info \
                    -Dsonar.junit.reportPaths=junit.xml \
                    -Dsonar.sourceEncoding=UTF-8
                '''
              }
            }
          }
        }
      }
    }

    stage("Wait for Quality Gates") {
      parallel {
        stage("Quality Gate - DataAnalyser") {
          steps {
            timeout(time: 3, unit: 'MINUTES') {
              waitForQualityGate abortPipeline: true
            }
          }
        }

        stage("Quality Gate - Transaction API") {
          steps {
            timeout(time: 3, unit: 'MINUTES') {
              waitForQualityGate abortPipeline: true
            }
          }
        }

        stage("Quality Gate - Client UI") {
          steps {
            timeout(time: 3, unit: 'MINUTES') {
              waitForQualityGate abortPipeline: true
            }
          }
        }
      }
    }

    stage("Build & Publish All Services") {
      steps {
        script {
          withCredentials([usernamePassword(credentialsId: 'NEXUS_CREDENTIAL', usernameVariable: 'NEXUS_USER', passwordVariable: 'NEXUS_PASS')]) {
            sh '''
              echo "//nexus-job.duckdns.org:31476/repository/npm-hosted/:username=$NEXUS_USER" > ~/.npmrc
              echo "//nexus-job.duckdns.org:31476/repository/npm-hosted/:_password=$(echo -n $NEXUS_PASS | base64)" >> ~/.npmrc
              echo "//nexus-job.duckdns.org:31476/repository/npm-hosted/:email=ci@example.com" >> ~/.npmrc
              echo "registry=http://nexus-job.duckdns.org:31476/repository/npm-hosted/" >> ~/.npmrc
            '''
          }

          parallel (
            "Publish DataAnalyserService": {
              dir('Services/DataAnalyserService') {
                sh '''
                  npm run build
                  npm version 1.0.${BUILD_NUMBER} --no-git-tag-version
                  npm publish --registry=http://nexus-job.duckdns.org:31476/repository/npm-hosted/
                '''
              }
            },
            "Publish TransactionGenerationAPI": {
              dir('Services/TransactionGenerationAPI') {
                sh '''
                  npm run build
                  npm version 1.0.${BUILD_NUMBER} --no-git-tag-version
                  npm publish --registry=http://nexus-job.duckdns.org:31476/repository/npm-hosted/
                '''
              }
            },
            "Publish Client_UI": {
              dir('Client_UI') {
                sh '''
                  npm run build
                  npm version 1.0.${BUILD_NUMBER} --no-git-tag-version
                  npm publish --registry=http://nexus-job.duckdns.org:31476/repository/npm-hosted/
                '''
              }
            }
          )
        }
      }
    }

    stage('Build Docker Images') {
      parallel {
        stage('DataAnalyser Image') {
          steps {
            script {
              withCredentials([usernamePassword(credentialsId: 'DOCKER_CREDENTIAL', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                sh '''
                  echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                  cd Services/DataAnalyserService
                  docker build -t ${DOCKER_REGISTRY}/data-analyser:${BUILD_NUMBER} .
                  docker tag ${DOCKER_REGISTRY}/data-analyser:${BUILD_NUMBER} ${DOCKER_REGISTRY}/data-analyser:latest
                  trivy image --exit-code 0 --severity HIGH,CRITICAL ${DOCKER_REGISTRY}/data-analyser:${BUILD_NUMBER} || echo 'Trivy scan completed with findings'
                  docker push ${DOCKER_REGISTRY}/data-analyser:${BUILD_NUMBER}
                  docker push ${DOCKER_REGISTRY}/data-analyser:latest
                '''
              }
            }
          }
        }

        stage('Transaction API Image') {
          steps {
            script {
              withCredentials([usernamePassword(credentialsId: 'DOCKER_CREDENTIAL', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                sh '''
                  echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                  cd Services/TransactionGenerationAPI
                  docker build -t ${DOCKER_REGISTRY}/transaction-api:${BUILD_NUMBER} .
                  docker tag ${DOCKER_REGISTRY}/transaction-api:${BUILD_NUMBER} ${DOCKER_REGISTRY}/transaction-api:latest
                  trivy image --exit-code 0 --severity HIGH,CRITICAL ${DOCKER_REGISTRY}/transaction-api:${BUILD_NUMBER} || echo 'Trivy scan completed with findings'
                  docker push ${DOCKER_REGISTRY}/transaction-api:${BUILD_NUMBER}
                  docker push ${DOCKER_REGISTRY}/transaction-api:latest
                '''
              }
            }
          }
        }

        stage('Client UI Image') {
          steps {
            script {
              withCredentials([usernamePassword(credentialsId: 'DOCKER_CREDENTIAL', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                sh '''
                  echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                  cd Client_UI
                  docker build -t ${DOCKER_REGISTRY}/client-ui:${BUILD_NUMBER} .
                  docker tag ${DOCKER_REGISTRY}/client-ui:${BUILD_NUMBER} ${DOCKER_REGISTRY}/client-ui:latest
                  trivy image --exit-code 0 --severity HIGH,CRITICAL ${DOCKER_REGISTRY}/client-ui:${BUILD_NUMBER} || echo 'Trivy scan completed with findings'
                  docker push ${DOCKER_REGISTRY}/client-ui:${BUILD_NUMBER}
                  docker push ${DOCKER_REGISTRY}/client-ui:latest
                '''
              }
            }
          }
        }
      }
    }

    stage('Trigger CD Pipeline') {
      steps {
        script {
          def commitMessage = sh(script: "git log -1 --pretty=%B", returnStdout: true).trim()
          echo " Last commit message: ${commitMessage}"
          if (commitMessage.contains("Merge pull request")) {
            echo " Merge commit detected! Triggering CD pipeline..."
            build job: 'CD', parameters: [
              string(name: 'DATA_ANALYSER_IMAGE', value: "${DOCKER_REGISTRY}/data-analyser:${BUILD_NUMBER}"),
              string(name: 'TRANSACTION_API_IMAGE', value: "${DOCKER_REGISTRY}/transaction-api:${BUILD_NUMBER}"),
              string(name: 'CLIENT_UI_IMAGE', value: "${DOCKER_REGISTRY}/client-ui:${BUILD_NUMBER}")
            ]
            
          } else {
            echo " Not a merge commit. Skipping CD pipeline."
          }
        }
      }
    }
  }

  post {
    always {
      echo '🧹 Cleaning Docker and workspace...'
      sh 'docker system prune -f || true'
      cleanWs()
    }
    success {
      slackSend(
      color: 'good',
      message: "✅ *${env.JOB_NAME}* #${env.BUILD_NUMBER} succeeded. (<${env.BUILD_URL}|Open>)",
      webhookUrl: credentials('SLACK_WEBHOOK')
    )
      echo '✅ Pipeline CI completed successfully!'
    }
    failure {
      slackSend(
      color: 'danger',
      message: "❌ *${env.JOB_NAME}* #${env.BUILD_NUMBER} failed! (<${env.BUILD_URL}|Open>)",
      webhookUrl: credentials('SLACK_WEBHOOK')
    )
      echo '❌ Pipeline failed!'
    }
  }
}
