<script setup lang="ts">
import { FlowNarrator, type FlowNarratorSpec } from '../src'
import '../src/style.css'

const spec: FlowNarratorSpec = {
  root: 'timeline-1',
  state: {
    currentStep: 0,
    playing: false,
  },
  elements: {
    'timeline-1': {
      type: 'FlowTimeline',
      props: {
        title: 'ETL Pipeline',
        description: 'Contentful CMS to DynamoDB',
      },
      children: ['node-1', 'node-2', 'node-3', 'node-4', 'node-5'],
    },
    'node-1': {
      type: 'TriggerNode',
      props: {
        label: 'CloudWatch Cron',
        description: 'Fires every 5 min via EventBridge',
        color: '#22c55e',
      },
    },
    'node-2': {
      type: 'CodeNode',
      props: {
        label: 'Ingest Lambda',
        file: 'lambdas/ingest.py',
        language: 'python',
        code: 'def handler(event, context):\n    client = contentful.Client(\n        space_id=os.environ["SPACE_ID"],\n        access_token=os.environ["TOKEN"]\n    )\n    entries = client.entries({"limit": 100})\n    return {\n        "statusCode": 200,\n        "body": json.dumps(entries)\n    }',
        comment: 'Fetches raw data from Contentful CMS',
        magicMoveSteps: [
          {
            code: 'def handler(event, context):\n    client = contentful.Client(\n        space_id=os.environ["SPACE_ID"],\n        access_token=os.environ["TOKEN"]\n    )',
            comment: 'Initialize the Contentful SDK client',
          },
          {
            code: 'def handler(event, context):\n    client = contentful.Client(\n        space_id=os.environ["SPACE_ID"],\n        access_token=os.environ["TOKEN"]\n    )\n    entries = client.entries({"limit": 100})',
            comment: 'Fetch up to 100 entries from the CMS',
          },
          {
            code: 'def handler(event, context):\n    client = contentful.Client(\n        space_id=os.environ["SPACE_ID"],\n        access_token=os.environ["TOKEN"]\n    )\n    entries = client.entries({"limit": 100})\n    return {\n        "statusCode": 200,\n        "body": json.dumps(entries)\n    }',
            comment: 'Return full payload to Step Functions',
          },
        ],
      },
    },
    'node-3': {
      type: 'CodeNode',
      props: {
        label: 'Transform',
        file: 'lambdas/transform.py',
        language: 'python',
        code: 'def transform(entries):\n    return [\n        {\n            "pk": e["sys"]["id"],\n            "title": e["fields"]["title"],\n            "body": e["fields"]["body"],\n            "ttl": int(time()) + 86400\n        }\n        for e in entries\n    ]',
        comment: 'Maps CMS entries to DynamoDB items with 24h TTL',
      },
    },
    'node-4': {
      type: 'DescriptionNode',
      props: {
        label: 'Batch Write',
        body: 'Items are written to DynamoDB using batch_write_item with automatic retry. Each batch contains up to 25 items.',
      },
    },
    'node-5': {
      type: 'LinkNode',
      props: {
        label: 'DynamoDB Console',
        href: 'https://console.aws.amazon.com/dynamodb',
        description: 'View persisted entries and monitor capacity',
      },
    },
  },
}
</script>

<template>
  <div class="h-screen w-screen bg-background">
    <FlowNarrator :src="spec" :interval="3500" />
  </div>
</template>
