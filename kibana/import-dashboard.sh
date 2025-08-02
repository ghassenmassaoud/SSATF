  #!/bin/sh
  echo "$(date) Kibana is healthy! Importing dashboard..."
  curl -v -X POST "http://kibana:5601/api/saved_objects/_import?overwrite=true" \
    -H "kbn-xsrf: true" \
    -F "file=@/dashboards/export.ndjson"
  ret=$?
  if [ $ret -ne 0 ]; then
    echo "$(date) Import failed with code $ret"
    exit $ret
  fi
  echo "$(date) Dashboard import attempted."
