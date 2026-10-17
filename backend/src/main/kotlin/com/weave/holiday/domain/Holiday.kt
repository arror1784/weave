package com.weave.holiday.domain

import com.weave.global.domain.BaseEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table
import org.hibernate.annotations.SQLDelete
import org.hibernate.annotations.SQLRestriction
import java.time.LocalDate

/** 공휴일 하루 — 공공데이터포털(한국천문연구원 특일 정보)에서 받아 둔다(HolidaySync) */
@Entity
@Table(name = "holidays")
@SQLDelete(sql = "UPDATE holidays SET deleted_at = now() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
class Holiday(
    @Column(nullable = false)
    val date: LocalDate,

    @Column(nullable = false, length = 100)
    var name: String,
) : BaseEntity()
