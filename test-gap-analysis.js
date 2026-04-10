/**
 * 测试脚本：验证 Specification-Driven Gap Analysis 系统
 * 
 * 运行：node test-gap-analysis.js
 */

const { GapAnalysisEngine, SpecParser, CodeScanner, GapDetector, TaskGenerator } = require('./dist/core/analysis/index.js');

async function main() {
  console.log('🚀 启动规范驱动的差距分析测试\n');
  
  const projectPath = 'D:\\test\\my-project';
  
  console.log(`📁 项目路径: ${projectPath}\n`);
  
  // 创建分析引擎
  const specParser = new SpecParser(projectPath);
  const codeScanner = new CodeScanner(projectPath);
  const gapDetector = new GapDetector();
  const taskGenerator = new TaskGenerator();
  
  const engine = new GapAnalysisEngine(
    specParser,
    codeScanner,
    gapDetector,
    taskGenerator
  );
  
  try {
    // 运行分析
    console.log('🔍 正在分析项目...\n');
    const tasks = await engine.analyze(projectPath);
    
    // 显示结果
    console.log('='.repeat(60));
    console.log(`✅ 分析完成！生成了 ${tasks.length} 个任务`);
    console.log('='.repeat(60));
    console.log();
    
    // 按优先级分组显示
    const p0Tasks = tasks.filter(t => t.priority === 'P0');
    const p1Tasks = tasks.filter(t => t.priority === 'P1');
    const p2Tasks = tasks.filter(t => t.priority === 'P2');
    
    if (p0Tasks.length > 0) {
      console.log(`🔴 P0 任务 (${p0Tasks.length} 个) - 阻塞级差距:`);
      p0Tasks.forEach((task, i) => {
        console.log(`  ${i + 1}. ${task.title}`);
        console.log(`     描述: ${task.description.split('\n')[0]}`);
        console.log(`     工作量: ${task.estimatedEffort}`);
        console.log();
      });
    }
    
    if (p1Tasks.length > 0) {
      console.log(`🟡 P1 任务 (${p1Tasks.length} 个) - 重要差距:`);
      p1Tasks.forEach((task, i) => {
        console.log(`  ${i + 1}. ${task.title}`);
        console.log(`     描述: ${task.description.split('\n')[0]}`);
        console.log(`     工作量: ${task.estimatedEffort}`);
        console.log();
      });
    }
    
    if (p2Tasks.length > 0) {
      console.log(`🟢 P2 任务 (${p2Tasks.length} 个) - 轻微差距:`);
      p2Tasks.forEach((task, i) => {
        console.log(`  ${i + 1}. ${task.title}`);
        console.log(`     描述: ${task.description.split('\n')[0]}`);
        console.log(`     工作量: ${task.estimatedEffort}`);
        console.log();
      });
    }
    
    // 显示第一个任务的详细信息作为示例
    if (tasks.length > 0) {
      console.log('='.repeat(60));
      console.log('📋 任务详情示例 (第一个任务):');
      console.log('='.repeat(60));
      const firstTask = tasks[0];
      console.log(`标题: ${firstTask.title}`);
      console.log(`描述:\n${firstTask.description}`);
      console.log(`\n实现要求:`);
      firstTask.requirements.forEach((req, i) => console.log(`  ${i + 1}. ${req}`));
      console.log(`\n建议方法:`);
      firstTask.suggestedApproach.forEach((step, i) => console.log(`  ${i + 1}. ${step}`));
      console.log(`\n验收标准:`);
      firstTask.acceptanceCriteria.forEach((criteria, i) => console.log(`  ${i + 1}. ${criteria}`));
    }
    
  } catch (error) {
    console.error('❌ 分析失败:', error.message);
    console.error(error.stack);
  }
}

main();
