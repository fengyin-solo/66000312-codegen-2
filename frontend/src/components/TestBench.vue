<template>
  <div class="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
    <div class="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h3 class="text-sm font-bold text-cyan-400">🧪 批量测试工作台</h3>
        <span class="text-xs text-slate-500">共 {{ testCasesStore.totalTestCases }} 条测试用例</span>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="runAllTests"
          :disabled="testCasesStore.isRunning"
          class="px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs font-bold text-white flex items-center gap-1 transition-colors"
        >
          <span v-if="testCasesStore.isRunning" class="animate-spin">⏳</span>
          <span v-else>▶</span>
          运行全部
        </button>
        <button
          @click="runSelectedGroupTests"
          :disabled="testCasesStore.isRunning || !testCasesStore.selectedGroup"
          class="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs font-bold text-white flex items-center gap-1 transition-colors"
        >
          <span v-if="testCasesStore.isRunning" class="animate-spin">⏳</span>
          <span v-else>▶</span>
          运行当前分组
        </button>
        <button
          @click="testCasesStore.clearResults"
          class="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 rounded text-xs font-bold text-white transition-colors"
        >
          清空结果
        </button>
      </div>
    </div>

    <div class="flex" style="height: 600px;">
      <div class="w-64 border-r border-slate-700 flex flex-col bg-slate-850">
        <div class="px-3 py-2 border-b border-slate-700 flex items-center justify-between">
          <span class="text-xs font-bold text-slate-400">测试分组</span>
          <button
            @click="openAddGroupModal"
            class="text-cyan-400 hover:text-cyan-300 text-lg leading-none"
          >
            +
          </button>
        </div>
        <div class="flex-1 overflow-y-auto">
          <div
            v-for="group in testCasesStore.groups"
            :key="group.id"
            @click="testCasesStore.selectGroup(group.id)"
            :class="[
              'px-3 py-2 cursor-pointer border-l-2 transition-colors group',
              testCasesStore.selectedGroupId === group.id
                ? 'bg-slate-700 border-l-cyan-400'
                : 'border-l-transparent hover:bg-slate-750'
            ]"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm text-slate-200 truncate">{{ group.name }}</span>
              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  @click.stop="openEditGroupModal(group)"
                  class="text-slate-400 hover:text-cyan-400 text-xs"
                >
                  ✏️
                </button>
                <button
                  @click.stop="confirmDeleteGroup(group)"
                  class="text-slate-400 hover:text-red-400 text-xs"
                >
                  🗑️
                </button>
              </div>
            </div>
            <div class="text-xs text-slate-500 mt-0.5">
              {{ group.testCases.length }} 条用例
              <span v-if="getGroupPassRate(group.id) !== null" class="ml-2">
                <span :class="getGroupPassRate(group.id) === 100 ? 'text-green-400' : getGroupPassRate(group.id) > 0 ? 'text-yellow-400' : 'text-red-400'">
                  {{ getGroupPassRate(group.id) }}%
                </span>
              </span>
            </div>
            <div v-if="group.pattern" class="text-[10px] font-mono text-slate-600 mt-1 truncate" :title="group.pattern">
              {{ group.pattern }}
            </div>
          </div>
          <div v-if="testCasesStore.groups.length === 0" class="px-3 py-4 text-center text-xs text-slate-500">
            暂无分组，点击 + 创建
          </div>
        </div>
      </div>

      <div class="flex-1 flex flex-col">
        <div class="px-3 py-2 border-b border-slate-700 flex items-center justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-3">
              <span class="text-xs font-bold text-slate-400">
                {{ testCasesStore.selectedGroup?.name || '请选择分组' }}
              </span>
              <span v-if="testCasesStore.selectedGroup" class="text-xs text-slate-500">
                {{ testCasesStore.selectedGroup.description }}
              </span>
            </div>
            <div v-if="testCasesStore.selectedGroup?.pattern" class="text-[10px] font-mono text-cyan-500 mt-1 truncate" :title="testCasesStore.selectedGroup.pattern">
              {{ testCasesStore.selectedGroup.pattern }}
            </div>
          </div>
          <button
            v-if="testCasesStore.selectedGroup"
            @click="openAddTestCaseModal"
            class="text-cyan-400 hover:text-cyan-300 text-sm font-bold"
          >
            + 添加用例
          </button>
        </div>

        <div class="flex-1 overflow-y-auto">
          <div v-if="testCasesStore.selectedGroup">
            <div
              v-for="testCase in testCasesStore.selectedGroup.testCases"
              :key="testCase.id"
              class="border-b border-slate-700 last:border-b-0"
            >
              <div
                @click="testCasesStore.toggleTestCaseExpanded(testCase.id)"
                class="px-3 py-2 cursor-pointer hover:bg-slate-750 flex items-center justify-between"
              >
                <div class="flex items-center gap-3 flex-1 min-w-0">
                  <span class="text-slate-400 text-xs">
                    {{ testCasesStore.isTestCaseExpanded(testCase.id) ? '▼' : '▶' }}
                  </span>
                  <div class="w-3 h-3 rounded-full flex-shrink-0" :class="getStatusColor(testCase.id)"></div>
                  <div class="min-w-0 flex-1">
                    <div class="text-sm text-slate-200 truncate">{{ testCase.name }}</div>
                    <div class="text-xs text-slate-500 font-mono truncate">
                      输入: "{{ testCase.input }}"
                      <span class="ml-2">
                        预期: <span :class="testCase.expectedResult === 'match' ? 'text-green-400' : 'text-red-400'">
                          {{ testCase.expectedResult === 'match' ? '匹配' : '不匹配' }}
                        </span>
                        <span v-if="testCase.expectedMatch"> → "{{ testCase.expectedMatch }}"</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-2 ml-2">
                  <button
                    @click.stop="openEditTestCaseModal(testCase)"
                    class="text-slate-400 hover:text-cyan-400 text-xs px-1"
                  >
                    ✏️
                  </button>
                  <button
                    @click.stop="confirmDeleteTestCase(testCase)"
                    class="text-slate-400 hover:text-red-400 text-xs px-1"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div v-if="testCasesStore.isTestCaseExpanded(testCase.id)" class="px-3 pb-3 pt-1 bg-slate-850">
                <div v-if="getResult(testCase.id)" class="space-y-2">
                  <div class="text-xs">
                    <span class="text-slate-400">测试结果: </span>
                    <span :class="getResult(testCase.id)?.passed ? 'text-green-400' : 'text-red-400'" class="font-bold">
                      {{ getResult(testCase.id)?.passed ? '✓ 通过' : '✗ 失败' }}
                    </span>
                  </div>
                  <div v-if="getResult(testCase.id)?.failureReason" class="text-xs text-red-400 bg-red-900/20 px-2 py-1.5 rounded border border-red-800/50">
                    <span class="font-bold">失败原因:</span> {{ getResult(testCase.id)?.failureReason }}
                  </div>
                  <div class="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span class="text-slate-400">实际匹配: </span>
                      <span :class="getResult(testCase.id)?.actualResult.matched ? 'text-green-400' : 'text-red-400'" class="font-mono">
                        {{ getResult(testCase.id)?.actualResult.matched ? `"${getResult(testCase.id)?.actualResult.matchText}"` : '无匹配' }}
                      </span>
                    </div>
                    <div>
                      <span class="text-slate-400">回溯次数: </span>
                      <span :class="(getResult(testCase.id)?.actualResult.backtracks || 0) > 0 ? 'text-orange-400' : 'text-slate-300'">
                        {{ getResult(testCase.id)?.actualResult.backtracks }}
                      </span>
                    </div>
                    <div>
                      <span class="text-slate-400">总步数: </span>
                      <span class="text-slate-300">{{ getResult(testCase.id)?.actualResult.totalSteps }}</span>
                    </div>
                    <div>
                      <span class="text-slate-400">耗时: </span>
                      <span class="text-slate-300">{{ getResult(testCase.id)?.actualResult.duration }}ms</span>
                    </div>
                  </div>
                  <div v-if="testCase.description" class="text-xs text-slate-400">
                    <span class="font-bold">备注:</span> {{ testCase.description }}
                  </div>
                </div>
                <div v-else class="text-xs text-slate-500">
                  点击运行测试查看结果
                </div>
              </div>
            </div>

            <div v-if="testCasesStore.selectedGroup.testCases.length === 0" class="px-3 py-8 text-center text-xs text-slate-500">
              该分组暂无测试用例，点击右上角"添加用例"创建
            </div>
          </div>

          <div v-else class="h-full flex items-center justify-center text-xs text-slate-500">
            请从左侧选择一个测试分组
          </div>
        </div>
      </div>

      <div class="w-72 border-l border-slate-700 flex flex-col">
        <div class="px-3 py-2 border-b border-slate-700">
          <span class="text-xs font-bold text-slate-400">测试统计</span>
        </div>

        <div class="p-3 space-y-3">
          <div class="bg-slate-750 rounded-lg p-3">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs text-slate-400">通过率</span>
              <span
                :class="[
                  'text-2xl font-bold',
                  testCasesStore.passRate === 100 ? 'text-green-400' :
                  testCasesStore.passRate > 0 ? 'text-yellow-400' : 'text-red-400'
                ]"
              >
                {{ testCasesStore.passRate }}%
              </span>
            </div>
            <div class="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                class="h-full transition-all duration-500"
                :class="[
                  testCasesStore.passRate === 100 ? 'bg-green-500' :
                  testCasesStore.passRate > 0 ? 'bg-yellow-500' : 'bg-red-500'
                ]"
                :style="{ width: `${testCasesStore.passRate}%` }"
              ></div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div class="bg-slate-750 rounded-lg p-2 text-center">
              <div class="text-lg font-bold text-slate-200">{{ testCasesStore.testResults.length }}</div>
              <div class="text-xs text-slate-500">已执行</div>
            </div>
            <div class="bg-slate-750 rounded-lg p-2 text-center">
              <div class="text-lg font-bold text-green-400">{{ testCasesStore.passedCount }}</div>
              <div class="text-xs text-slate-500">通过</div>
            </div>
            <div class="bg-slate-750 rounded-lg p-2 text-center">
              <div class="text-lg font-bold text-red-400">{{ testCasesStore.failedCount }}</div>
              <div class="text-xs text-slate-500">失败</div>
            </div>
            <div class="bg-slate-750 rounded-lg p-2 text-center">
              <div class="text-lg font-bold text-cyan-400">{{ testCasesStore.totalTestCases }}</div>
              <div class="text-xs text-slate-500">总用例</div>
            </div>
          </div>

          <div v-if="failedTestCases.length > 0" class="space-y-2">
            <div class="text-xs font-bold text-red-400 flex items-center gap-1">
              <span>⚠️</span> 失败用例列表
            </div>
            <div class="space-y-1 max-h-64 overflow-y-auto">
              <div
                v-for="result in failedTestCases"
                :key="result.testCaseId"
                class="bg-red-900/20 border border-red-800/50 rounded px-2 py-1.5 text-xs cursor-pointer hover:bg-red-900/30 transition-colors"
                @click="scrollToTestCase(result.testCaseId)"
              >
                <div class="text-red-400 font-bold truncate">{{ result.testCaseName }}</div>
                <div class="text-red-300/70 text-[10px] mt-0.5 truncate">
                  {{ result.failureReason }}
                </div>
              </div>
            </div>
          </div>

          <div class="pt-2 border-t border-slate-700">
            <button
              @click="confirmReset"
              class="w-full px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300 transition-colors"
            >
              🔄 重置为默认数据
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showGroupModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="closeGroupModal">
      <div class="bg-slate-800 border border-slate-600 rounded-lg p-4 w-96">
        <h3 class="text-sm font-bold text-cyan-400 mb-4">
          {{ editingGroup ? '编辑分组' : '新增分组' }}
        </h3>
        <div class="space-y-3">
          <div>
            <label class="block text-xs text-slate-400 mb-1">分组名称</label>
            <input
              v-model="groupForm.name"
              type="text"
              class="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
              placeholder="输入分组名称..."
            />
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">分组描述（可选）</label>
            <textarea
              v-model="groupForm.description"
              rows="2"
              class="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"
              placeholder="输入分组描述..."
            ></textarea>
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">正则表达式</label>
            <input
              v-model="groupForm.pattern"
              type="text"
              class="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-sm font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
              placeholder="输入正则表达式，如：^\\d{4}-\\d{2}-\\d{2}$"
            />
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <button
            @click="closeGroupModal"
            class="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 rounded text-sm text-slate-200"
          >
            取消
          </button>
          <button
            @click="saveGroup"
            :disabled="!groupForm.name.trim()"
            class="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded text-sm text-white"
          >
            保存
          </button>
        </div>
      </div>
    </div>

    <div v-if="showTestCaseModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="closeTestCaseModal">
      <div class="bg-slate-800 border border-slate-600 rounded-lg p-4 w-[500px] max-h-[90vh] overflow-y-auto">
        <h3 class="text-sm font-bold text-cyan-400 mb-4">
          {{ editingTestCase ? '编辑测试用例' : '新增测试用例' }}
        </h3>
        <div class="space-y-3">
          <div>
            <label class="block text-xs text-slate-400 mb-1">用例名称</label>
            <input
              v-model="testCaseForm.name"
              type="text"
              class="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
              placeholder="输入用例名称..."
            />
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">测试输入</label>
            <input
              v-model="testCaseForm.input"
              type="text"
              class="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-sm font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
              placeholder="输入测试字符串..."
            />
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">预期结果</label>
            <div class="flex gap-4">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  v-model="testCaseForm.expectedResult"
                  type="radio"
                  value="match"
                  class="text-green-500"
                />
                <span class="text-sm text-green-400">✓ 应该匹配</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  v-model="testCaseForm.expectedResult"
                  type="radio"
                  value="no-match"
                  class="text-red-500"
                />
                <span class="text-sm text-red-400">✗ 应该不匹配</span>
              </label>
            </div>
          </div>
          <div v-if="testCaseForm.expectedResult === 'match'">
            <label class="block text-xs text-slate-400 mb-1">预期匹配文本（可选）</label>
            <input
              v-model="testCaseForm.expectedMatch"
              type="text"
              class="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-sm font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
              placeholder="输入预期匹配的文本，留空则只校验是否匹配..."
            />
            <div class="text-[10px] text-slate-500 mt-1">如果填写，将精确校验匹配到的文本内容</div>
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">用例描述（可选）</label>
            <textarea
              v-model="testCaseForm.description"
              rows="2"
              class="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"
              placeholder="输入用例描述..."
            ></textarea>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <button
            @click="closeTestCaseModal"
            class="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 rounded text-sm text-slate-200"
          >
            取消
          </button>
          <button
            @click="saveTestCase"
            :disabled="!testCaseForm.name.trim() || !testCaseForm.input.trim()"
            class="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded text-sm text-white"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTestCasesStore } from '../store/testCases'
import { useRegexStore } from '../store/regex'
import type { TestCaseGroup, TestCase } from '../types'

const testCasesStore = useTestCasesStore()
const regexStore = useRegexStore()

const showGroupModal = ref(false)
const showTestCaseModal = ref(false)
const editingGroup = ref<TestCaseGroup | null>(null)
const editingTestCase = ref<TestCase | null>(null)

const groupForm = ref({
  name: '',
  description: '',
  pattern: ''
})

const testCaseForm = ref({
  name: '',
  input: '',
  expectedResult: 'match' as 'match' | 'no-match',
  expectedMatch: '',
  description: ''
})

const failedTestCases = computed(() => {
  return testCasesStore.testResults.filter(r => !r.passed)
})

function getResult(testCaseId: string) {
  return testCasesStore.testResults.find(r => r.testCaseId === testCaseId)
}

function getStatusColor(testCaseId: string): string {
  const result = getResult(testCaseId)
  if (!result) return 'bg-slate-600'
  return result.passed ? 'bg-green-500' : 'bg-red-500'
}

function getGroupPassRate(groupId: string): number | null {
  const group = testCasesStore.groups.find(g => g.id === groupId)
  if (!group || group.testCases.length === 0) return null

  const groupResults = testCasesStore.testResults.filter(r =>
    group.testCases.some(tc => tc.id === r.testCaseId)
  )
  if (groupResults.length === 0) return null

  const passed = groupResults.filter(r => r.passed).length
  return Math.round((passed / groupResults.length) * 100)
}

function openAddGroupModal() {
  editingGroup.value = null
  groupForm.value = { name: '', description: '', pattern: '' }
  showGroupModal.value = true
}

function openEditGroupModal(group: TestCaseGroup) {
  editingGroup.value = group
  groupForm.value = {
    name: group.name,
    description: group.description || '',
    pattern: group.pattern || ''
  }
  showGroupModal.value = true
}

function closeGroupModal() {
  showGroupModal.value = false
  editingGroup.value = null
}

function saveGroup() {
  if (!groupForm.value.name.trim()) return

  if (editingGroup.value) {
    testCasesStore.updateGroup(
      editingGroup.value.id,
      groupForm.value.name.trim(),
      groupForm.value.description.trim() || undefined,
      groupForm.value.pattern.trim()
    )
  } else {
    testCasesStore.addGroup(
      groupForm.value.name.trim(),
      groupForm.value.description.trim() || undefined,
      groupForm.value.pattern.trim()
    )
  }

  closeGroupModal()
}

function confirmDeleteGroup(group: TestCaseGroup) {
  if (confirm(`确定要删除分组 "${group.name}" 吗？该分组下的所有测试用例也将被删除。`)) {
    testCasesStore.deleteGroup(group.id)
  }
}

function openAddTestCaseModal() {
  editingTestCase.value = null
  testCaseForm.value = {
    name: '',
    input: '',
    expectedResult: 'match',
    expectedMatch: '',
    description: ''
  }
  showTestCaseModal.value = true
}

function openEditTestCaseModal(testCase: TestCase) {
  editingTestCase.value = testCase
  testCaseForm.value = {
    name: testCase.name,
    input: testCase.input,
    expectedResult: testCase.expectedResult,
    expectedMatch: testCase.expectedMatch || '',
    description: testCase.description || ''
  }
  showTestCaseModal.value = true
}

function closeTestCaseModal() {
  showTestCaseModal.value = false
  editingTestCase.value = null
}

function saveTestCase() {
  if (!testCaseForm.value.name.trim() || !testCaseForm.value.input.trim()) return
  if (!testCasesStore.selectedGroupId) return

  const testCaseData = {
    name: testCaseForm.value.name.trim(),
    input: testCaseForm.value.input.trim(),
    expectedResult: testCaseForm.value.expectedResult,
    expectedMatch: testCaseForm.value.expectedResult === 'match' && testCaseForm.value.expectedMatch.trim()
      ? testCaseForm.value.expectedMatch.trim()
      : undefined,
    description: testCaseForm.value.description.trim() || undefined
  }

  if (editingTestCase.value) {
    testCasesStore.updateTestCase(
      testCasesStore.selectedGroupId,
      editingTestCase.value.id,
      testCaseData
    )
  } else {
    testCasesStore.addTestCase(testCasesStore.selectedGroupId, testCaseData)
  }

  closeTestCaseModal()
}

function confirmDeleteTestCase(testCase: TestCase) {
  if (!testCasesStore.selectedGroupId) return
  if (confirm(`确定要删除测试用例 "${testCase.name}" 吗？`)) {
    testCasesStore.deleteTestCase(testCasesStore.selectedGroupId, testCase.id)
  }
}

async function runAllTests() {
  await testCasesStore.runAllTests()
}

async function runSelectedGroupTests() {
  if (!testCasesStore.selectedGroupId) return
  await testCasesStore.runGroupTests(testCasesStore.selectedGroupId)
}

function scrollToTestCase(testCaseId: string) {
  const group = testCasesStore.groups.find(g =>
    g.testCases.some(tc => tc.id === testCaseId)
  )
  if (group) {
    testCasesStore.selectGroup(group.id)
    if (!testCasesStore.isTestCaseExpanded(testCaseId)) {
      testCasesStore.toggleTestCaseExpanded(testCaseId)
    }
  }
}

function confirmReset() {
  if (confirm('确定要重置为默认测试数据吗？所有自定义数据将被清除。')) {
    testCasesStore.resetToDefaults()
  }
}
</script>

<style scoped>
.bg-slate-750 {
  background-color: rgb(41, 51, 71);
}
.bg-slate-850 {
  background-color: rgb(24, 32, 51);
}
.hover\:bg-slate-750:hover {
  background-color: rgb(41, 51, 71);
}
.hover\:bg-slate-850:hover {
  background-color: rgb(24, 32, 51);
}
</style>
