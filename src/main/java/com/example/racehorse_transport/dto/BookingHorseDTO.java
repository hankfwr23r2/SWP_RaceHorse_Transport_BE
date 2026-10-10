package com.example.racehorse_transport.dto;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.io.Serializable;
import com.example.racehorse_transport.entity.BookingHorseId;
import java.time.Instant;
import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BookingHorseDTO implements Serializable {
    private BookingHorseId id;
    private Integer bookingID;
    private Integer horseID;
    private Instant addedDate;
    private BigDecimal totalHorseServicePrice;
}
