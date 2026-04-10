/**
 * 测试新项目的规范驱动分析
 */

const { GapAnalysisEngine, SpecParser, CodeScanner, GapDetector, TaskGenerator } = require('./dist/core/analysis/index.js');

async function main() {
  console.log('🚀 分析新项目: my-new-project\n');
  
  const projectPath = 'D:\\test\\my-new-project';
  
  // 创建分析引擎
  const engine = new GapAnalysisEngine(
    new SpecParser(projectPath),
    new CodeScanner(projectPath),
    new GapDetector(),
    new TaskGenerator()
  );
  
  try {
    const tasks = await engine.analyze(projectPath);
    
    console.log('='.repeat(70));
    console.log(`✅ 分析完成！生成了 ${tasks.length} 个开发任务`);
    console.log('='.repeat(70));
    console.log();
    
    // 按优先级分组
    const p0 = tasks.filter(t => t.priority === 'P0');
    const p1 = tasks.filter(t => t.priority === 'P1');
    const p2 = tasks.filter(t => t.priority === 'P2');
    
    console.log(`📊 任务统计:`);
    console.log(`  🔴 P0 (阻塞级): ${p0.length} 个`);
    console.log(`  🟡 P1 (重要级): ${p1.length} 个`);
    console.log(`  🟢 P2 (轻微级): ${p2.length} 个`);
    console.log();
    
    if (p0.length > 0) {
      console.log('🔴 P0 任务 - 需要优先实现:');
      p0.forEach((t, i) => console.log(`  ${i+1}. ${t.title} (${t.estimatedEffort})`));
      console.log();
    }
    
    if (tasks.length > 0) {
      console.log('📋 示例任务详情:');
      console.log(`标题: ${tasks[0].title}`);
      console.log(`描述: ${tasks[0].description.slice(0, 100)}...`);
      console.log(`要求数: ${tasks[0].requirements.length}`);
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
}

main();
