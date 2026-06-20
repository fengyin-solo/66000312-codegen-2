import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TestCaseGroup, TestCase, TestCaseResult } from '../types'
import { buildNFA, runMatch } from './regex'

const STORAGE_KEY = 'regex-test-cases'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

function getDefaultGroups(): TestCaseGroup[] {
  return [
    {
      id: generateId(),
      name: '邮箱地址测试',
      description: '验证邮箱正则表达式的各种场景',
      pattern: '^([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+)\\.([a-zA-Z]{2,})$',
      testCases: [
        {
          id: generateId(),
          name: '标准邮箱',
          input: 'user@example.com',
          expectedResult: 'match',
          expectedMatch: 'user@example.com',
          description: '标准格式邮箱应该匹配'
        },
        {
          id: generateId(),
          name: '含加号邮箱',
          input: 'user+tag@example.com',
          expectedResult: 'match',
          expectedMatch: 'user+tag@example.com',
          description: '含加号的邮箱别名应该匹配'
        },
        {
          id: generateId(),
          name: '含点号用户名',
          input: 'user.name@example.com',
          expectedResult: 'match',
          expectedMatch: 'user.name@example.com',
          description: '用户名含点号应该匹配'
        },
        {
          id: generateId(),
          name: '缺少@符号',
          input: 'userexample.com',
          expectedResult: 'no-match',
          description: '缺少@符号应该不匹配'
        },
        {
          id: generateId(),
          name: '缺少域名',
          input: 'user@',
          expectedResult: 'no-match',
          description: '缺少域名应该不匹配'
        }
      ]
    },
    {
      id: generateId(),
      name: '日期格式测试',
      description: '验证YYYY-MM-DD日期格式',
      pattern: '^(\\d{4})-(\\d{2})-(\\d{2})$',
      testCases: [
        {
          id: generateId(),
          name: '有效日期',
          input: '2024-01-15',
          expectedResult: 'match',
          expectedMatch: '2024-01-15',
          description: '标准日期格式应该匹配'
        },
        {
          id: generateId(),
          name: '无效月份',
          input: '2024-13-01',
          expectedResult: 'match',
          expectedMatch: '2024-13-01',
          description: '格式正确但月份超出范围（仅格式校验）'
        },
        {
          id: generateId(),
          name: '格式错误',
          input: '2024/01/15',
          expectedResult: 'no-match',
          description: '使用斜杠分隔应该不匹配'
        },
        {
          id: generateId(),
          name: '年份不足4位',
          input: '24-01-15',
          expectedResult: 'no-match',
          description: '年份不足4位应该不匹配'
        }
      ]
    },
    {
      id: generateId(),
      name: '手机号码测试',
      description: '验证中国大陆手机号格式',
      pattern: '^1[3-9]\\d{9}$',
      testCases: [
        {
          id: generateId(),
          name: '有效手机号',
          input: '13800138000',
          expectedResult: 'match',
          expectedMatch: '13800138000',
          description: '标准11位手机号应该匹配'
        },
        {
          id: generateId(),
          name: '以10开头',
          input: '10800138000',
          expectedResult: 'no-match',
          description: '以10开头应该不匹配'
        },
        {
          id: generateId(),
          name: '位数不足',
          input: '1380013800',
          expectedResult: 'no-match',
          description: '不足11位应该不匹配'
        },
        {
          id: generateId(),
          name: '包含非数字',
          input: '1380013800a',
          expectedResult: 'no-match',
          description: '包含字母应该不匹配'
        }
      ]
    }
  ]
}

function loadFromStorage(): TestCaseGroup[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      return data.map((group: any) => ({
        ...group,
        pattern: group.pattern || ''
      }))
    }
  } catch (e) {
    console.error('Failed to load test cases from storage:', e)
  }
  return getDefaultGroups()
}

function saveToStorage(groups: TestCaseGroup[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups))
  } catch (e) {
    console.error('Failed to save test cases to storage:', e)
  }
}

export const useTestCasesStore = defineStore('testCases', () => {
  const groups = ref<TestCaseGroup[]>(loadFromStorage())
  const selectedGroupId = ref<string | null>(groups.value.length > 0 ? groups.value[0].id : null)
  const testResults = ref<TestCaseResult[]>([])
  const isRunning = ref(false)
  const expandedTestCaseIds = ref<Set<string>>(new Set())

  const selectedGroup = computed(() => {
    return groups.value.find(g => g.id === selectedGroupId.value) || null
  })

  const totalTestCases = computed(() => {
    return groups.value.reduce((sum, g) => sum + g.testCases.length, 0)
  })

  const passedCount = computed(() => {
    return testResults.value.filter(r => r.passed).length
  })

  const failedCount = computed(() => {
    return testResults.value.filter(r => !r.passed).length
  })

  const passRate = computed(() => {
    if (testResults.value.length === 0) return 0
    return Math.round((passedCount.value / testResults.value.length) * 100)
  })

  function saveGroups() {
    saveToStorage(groups.value)
  }

  function selectGroup(groupId: string) {
    selectedGroupId.value = groupId
  }

  function addGroup(name: string, description?: string, pattern: string = '') {
    const newGroup: TestCaseGroup = {
      id: generateId(),
      name,
      description,
      pattern,
      testCases: []
    }
    groups.value.push(newGroup)
    selectedGroupId.value = newGroup.id
    saveGroups()
    return newGroup
  }

  function updateGroup(groupId: string, name: string, description?: string, pattern?: string) {
    const group = groups.value.find(g => g.id === groupId)
    if (group) {
      group.name = name
      group.description = description
      if (pattern !== undefined) {
        group.pattern = pattern
      }
      saveGroups()
    }
  }

  function deleteGroup(groupId: string) {
    const index = groups.value.findIndex(g => g.id === groupId)
    if (index !== -1) {
      groups.value.splice(index, 1)
      if (selectedGroupId.value === groupId) {
        selectedGroupId.value = groups.value.length > 0 ? groups.value[0].id : null
      }
      testResults.value = testResults.value.filter(r => {
        const group = groups.value.find(g => g.testCases.some(tc => tc.id === r.testCaseId))
        return group !== undefined
      })
      saveGroups()
    }
  }

  function addTestCase(groupId: string, testCase: Omit<TestCase, 'id'>) {
    const group = groups.value.find(g => g.id === groupId)
    if (group) {
      const newTestCase: TestCase = {
        id: generateId(),
        ...testCase
      }
      group.testCases.push(newTestCase)
      saveGroups()
      return newTestCase
    }
    return null
  }

  function updateTestCase(groupId: string, testCaseId: string, updates: Partial<Omit<TestCase, 'id'>>) {
    const group = groups.value.find(g => g.id === groupId)
    if (group) {
      const testCase = group.testCases.find(tc => tc.id === testCaseId)
      if (testCase) {
        Object.assign(testCase, updates)
        saveGroups()
      }
    }
  }

  function deleteTestCase(groupId: string, testCaseId: string) {
    const group = groups.value.find(g => g.id === groupId)
    if (group) {
      const index = group.testCases.findIndex(tc => tc.id === testCaseId)
      if (index !== -1) {
        group.testCases.splice(index, 1)
        testResults.value = testResults.value.filter(r => r.testCaseId !== testCaseId)
        saveGroups()
      }
    }
  }

  function toggleTestCaseExpanded(testCaseId: string) {
    if (expandedTestCaseIds.value.has(testCaseId)) {
      expandedTestCaseIds.value.delete(testCaseId)
    } else {
      expandedTestCaseIds.value.add(testCaseId)
    }
  }

  function isTestCaseExpanded(testCaseId: string): boolean {
    return expandedTestCaseIds.value.has(testCaseId)
  }

  function runTestCase(pattern: string, testCase: TestCase): TestCaseResult {
    let actualResult
    try {
      const built = buildNFA(pattern)
      actualResult = runMatch(built.states, built.startState, testCase.input)
    } catch (e) {
      actualResult = {
        matched: false,
        matchText: '',
        groups: [],
        steps: [],
        backtracks: 0,
        totalSteps: 0,
        duration: 0
      }
    }

    let passed = true
    let failureReason: string | undefined

    if (testCase.expectedResult === 'match') {
      if (!actualResult.matched) {
        passed = false
        failureReason = `预期匹配但实际未匹配，输入 "${testCase.input}" 未能匹配正则表达式`
      } else if (testCase.expectedMatch && actualResult.matchText !== testCase.expectedMatch) {
        passed = false
        failureReason = `预期匹配文本 "${testCase.expectedMatch}"，但实际匹配 "${actualResult.matchText}"`
      }
    } else {
      if (actualResult.matched) {
        passed = false
        failureReason = `预期不匹配但实际匹配了 "${actualResult.matchText}"，输入 "${testCase.input}" 不应被匹配`
      }
    }

    return {
      testCaseId: testCase.id,
      testCaseName: testCase.name,
      input: testCase.input,
      expectedResult: testCase.expectedResult,
      expectedMatch: testCase.expectedMatch,
      actualResult,
      passed,
      failureReason
    }
  }

  async function runAllTests(selectedGroupIds?: string[]) {
    isRunning.value = true
    testResults.value = []

    const groupsToRun = selectedGroupIds
      ? groups.value.filter(g => selectedGroupIds.includes(g.id))
      : groups.value

    for (const group of groupsToRun) {
      for (const testCase of group.testCases) {
        await new Promise(resolve => setTimeout(resolve, 50))
        const result = runTestCase(group.pattern, testCase)
        testResults.value.push(result)
      }
    }

    isRunning.value = false
  }

  async function runGroupTests(groupId: string) {
    isRunning.value = true
    testResults.value = []

    const group = groups.value.find(g => g.id === groupId)
    if (group) {
      for (const testCase of group.testCases) {
        await new Promise(resolve => setTimeout(resolve, 50))
        const result = runTestCase(group.pattern, testCase)
        testResults.value.push(result)
      }
    }

    isRunning.value = false
  }

  function clearResults() {
    testResults.value = []
  }

  function resetToDefaults() {
    groups.value = getDefaultGroups()
    selectedGroupId.value = groups.value.length > 0 ? groups.value[0].id : null
    testResults.value = []
    saveGroups()
  }

  return {
    groups,
    selectedGroupId,
    selectedGroup,
    testResults,
    isRunning,
    totalTestCases,
    passedCount,
    failedCount,
    passRate,
    selectGroup,
    addGroup,
    updateGroup,
    deleteGroup,
    addTestCase,
    updateTestCase,
    deleteTestCase,
    toggleTestCaseExpanded,
    isTestCaseExpanded,
    runAllTests,
    runGroupTests,
    runTestCase,
    clearResults,
    resetToDefaults
  }
})
