import type { PipelineNode, PipelineEdge } from '../types/pipeline';
import { topoSort } from '../engine/executor';

export function generatePySparkCode(pipelineName: string, nodes: PipelineNode[], edges: PipelineEdge[]): string {
  const sortedIds = topoSort(nodes, edges);
  
  let code = `from pyspark.sql import SparkSession\n`;
  code += `from pyspark.sql.functions import col, lit\n\n`;
  code += `# Initialize Spark Session\n`;
  code += `spark = SparkSession.builder \\\n`;
  code += `    .appName("${pipelineName.replace(/[^a-zA-Z0-9]/g, '_')}") \\\n`;
  code += `    .getOrCreate()\n\n`;

  for (const nodeId of sortedIds) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) continue;
    
    const safeId = nodeId.replace(/-/g, '_');
    const incomingEdges = edges.filter(e => e.target === nodeId);
    const sourceId = incomingEdges.length > 0 ? incomingEdges[0].source.replace(/-/g, '_') : null;

    code += `# Node: ${node.data.label || node.data.subType}\n`;

    if (node.data.category === 'source') {
      const type = node.data.subType;
      if (type === 'postgres' || type === 'mysql') {
        code += `df_${safeId} = spark.read \\\n`;
        code += `    .format("jdbc") \\\n`;
        code += `    .option("url", "jdbc:${type}://host:port/db") \\\n`;
        code += `    .option("dbtable", "table_name") \\\n`;
        code += `    .option("user", "username") \\\n`;
        code += `    .option("password", "password") \\\n`;
        code += `    .load()\n\n`;
      } else {
        code += `df_${safeId} = spark.read.csv("path/to/data.csv", header=True, inferSchema=True)\n\n`;
      }
    } 
    else if (node.data.category === 'transform' || node.data.category === 'validation') {
      const config = (node.data.config as any) || {};
      if (!sourceId) {
         code += `df_${safeId} = None # Missing input\n\n`;
         continue;
      }
      
      let baseDf = `df_${sourceId}`;

      if (node.data.subType === 'filter' && config.conditions) {
         const conditions = config.conditions.map((c: any) => {
            if (c.operator === 'equals') return `col("${c.field}") == "${c.value}"`;
            if (c.operator === 'greater_than') return `col("${c.field}") > ${c.value}`;
            if (c.operator === 'less_than') return `col("${c.field}") < ${c.value}`;
            return `col("${c.field}").isNotNull()`;
         }).join(' & ');
         code += `df_${safeId} = ${baseDf}.filter(${conditions || 'True'})\n\n`;
      } 
      else if (node.data.subType === 'sort' && config.sortBy) {
         const order = config.order === 'desc' ? 'desc()' : 'asc()';
         code += `df_${safeId} = ${baseDf}.orderBy(col("${config.sortBy}").${order})\n\n`;
      }
      else if (node.data.subType === 'rename' && config.renames) {
         let renameChain = config.renames.map((r: any) => `.withColumnRenamed("${r.oldName}", "${r.newName}")`).join(' \\\n    ');
         code += `df_${safeId} = ${baseDf} \\\n    ${renameChain}\n\n`;
      }
      else if (node.data.subType === 'deduplicate' && config.subset) {
         const subsetStr = Array.isArray(config.subset) 
            ? `[${config.subset.map((f: string) => `"${f}"`).join(', ')}]`
            : `["${config.subset}"]`;
         code += `df_${safeId} = ${baseDf}.dropDuplicates(${subsetStr})\n\n`;
      }
      else {
         code += `df_${safeId} = ${baseDf} # Transformation logic for ${node.data.subType}\n\n`;
      }
    }
    else if (node.data.category === 'destination') {
      if (!sourceId) {
         code += `# Missing input for destination\n\n`;
         continue;
      }
      code += `df_${sourceId}.write \\\n`;
      code += `    .format("parquet") \\\n`;
      code += `    .mode("overwrite") \\\n`;
      code += `    .save("s3://bucket/output_path/")\n\n`;
    }
  }

  code += `# Stop Spark Session\n`;
  code += `spark.stop()\n`;

  return code;
}
