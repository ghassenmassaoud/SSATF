pipeline {
  agent any

  stages {
    stage('Check Docker Access') {
      steps {
        sh 'docker version'
        sh 'docker info'
      }
    }

    stage('Checkout') {
      steps {
        git branch: 'devops', credentialsId: 'GIT_CREDENTIAL', url: 'https://github.com/ghassenmassaoud/SSATF.git'
      }
    }

    stage('Trigger CD Pipeline') {
      when {
        expression {
          sh(script: "git log -1 --pretty=%B | grep -q 'Merge pull request'", returnStatus: true) == 0
        }
      }
      steps {
        echo "Triggering CD because this is a merge commit."
        build job: 'CD'
      }
    }
  }
}
