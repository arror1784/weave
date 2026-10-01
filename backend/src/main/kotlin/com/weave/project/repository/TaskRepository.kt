package com.weave.project.repository

import com.weave.project.domain.Task
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query

interface TaskRepository : JpaRepository<Task, Long> {
    fun findByProjectIdOrderByPosition(projectId: Long): List<Task>

    fun findByProjectIdInOrderByProjectIdAscPositionAsc(projectIds: Collection<Long>): List<Task>

    /** 본인 프로젝트의 작업만 (IDOR 방지 §3-6) */
    @Query("SELECT t FROM Task t WHERE t.id = :id AND t.projectId IN (SELECT p.id FROM Project p WHERE p.userId = :userId)")
    fun findOwned(id: Long, userId: Long): Task?

    /** 탈퇴 시 실제 삭제 ① 선행 연결(자기 참조 FK)을 먼저 끊는다 */
    @Modifying
    @Query(value = "UPDATE tasks SET depends_on_id = NULL WHERE project_id IN (SELECT id FROM projects WHERE user_id = :userId)", nativeQuery = true)
    fun unlinkDependenciesByUserId(userId: Long)

    /** 탈퇴 시 실제 삭제 ② (§3-17) */
    @Modifying
    @Query(value = "DELETE FROM tasks WHERE project_id IN (SELECT id FROM projects WHERE user_id = :userId)", nativeQuery = true)
    fun hardDeleteByUserId(userId: Long)
}
