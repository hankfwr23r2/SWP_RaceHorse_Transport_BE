package com.example.racehorse_transport.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Nationalized;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "SYSTEM_LOG")
public class SystemLog {
    @Id
    @Column(name = "SystemLogID", nullable = false)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ActionBy_UserID")
    private User actionbyUserid;

    @Size(max = 100)
    @Column(name = "ActionType", length = 100)
    private String actionType;

    @Size(max = 100)
    @Column(name = "TargetTable", length = 100)
    private String targetTable;

    @Column(name = "TargetRecordID")
    private Integer targetRecordID;

    @Nationalized
    @Lob
    @Column(name = "OldData")
    private String oldData;

    @Nationalized
    @Lob
    @Column(name = "NewData")
    private String newData;

    @Column(name = "CreatedAt")
    private Instant createdAt;


}