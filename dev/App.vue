<script setup lang="ts">
import { FlowNarrator, type FlowNarratorSpec } from '../src'

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
        minHeight: 620,
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
        wrapLongLines: true,
        code: 'def handler(event, context):\n    client = contentful.Client(\n        space_id=os.environ["SPACE_ID"],\n        access_token=os.environ["TOKEN"]\n    )\n    entries = client.entries({"limit": 100})\n    return {\n        "statusCode": 200,\n        "body": json.dumps(entries)\n    }',
        comment: 'Fetches raw data from Contentful CMS',
        story: 'Dev note: this lambda is intentionally defensive because upstream schema drift is common.',
        magicMoveSteps: [
          {
            code: 'def handler(event, context):\n    client = contentful.Client(\n        space_id=os.environ["SPACE_ID"],\n        access_token=os.environ["TOKEN"]\n    )',
            title: 'Boot client',
            story: 'Dev: first we hydrate the Contentful client with runtime credentials.',
            speaker: 'Dev',
          },
          {
            code: 'def handler(event, context):\n    client = contentful.Client(\n        space_id=os.environ["SPACE_ID"],\n        access_token=os.environ["TOKEN"]\n    )\n    entries = client.entries({"limit": 100})',
            title: 'Pull entries',
            story: 'Narrator: we fetch up to 100 entries as the raw ingest payload.',
            speaker: 'Narrator',
          },
          {
            code: 'def handler(event, context):\n    client = contentful.Client(\n        space_id=os.environ["SPACE_ID"],\n        access_token=os.environ["TOKEN"]\n    )\n    entries = client.entries({"limit": 100})\n\n    telemetry.log("entries_count", len(entries))',
            title: 'Observe payload',
            story: 'Dev: emit lightweight telemetry before returning so we can debug spikes.',
            speaker: 'Dev',
          },
          {
            code: 'def handler(event, context):\n    client = contentful.Client(\n        space_id=os.environ["SPACE_ID"],\n        access_token=os.environ["TOKEN"]\n    )\n    entries = client.entries({"limit": 100})\n\n    telemetry.log("entries_count", len(entries))\n\n    return {\n        "statusCode": 200,\n        "body": json.dumps(entries)\n    }',
            title: 'Return batch',
            story: 'Narrator: the raw payload is serialized and sent forward to Step Functions.',
            speaker: 'Narrator',
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
  <div style="width: 100vw; height: 100vh; display: grid; position: relative;" class="h-screen w-screen bg-background">
    <FlowNarrator :src="spec" :interval="3500" />
  </div>
</template>
